# Milestone 2 — The Art Phase

## Context
Milestone 1 (the design phase) is complete: the factory autonomously produces a
validated `GameDefinitionV1`. Milestone 2 is the next step. The contract orders it
explicitly — [`EntityId`](../src/contracts/gameDefinition.ts) is tagged "Shared by
design, **art (M2), coding (M3)**" — so M2 is the **art / sprite phase** (M3 is coding).

**Goal:** from a validated `GameDefinition`, autonomously generate one sprite per
entity and emit a new versioned artifact, `SpritePackV1` — the M2→M3 contract.

**Approach:** an LLM emits a sprite **DSL**; a pure-TS **deterministic compiler**
renders it to boolean pixel masks. No image model, no new dependency or cost, fully
TDD-able. Rebuilt from the prototype's proven approach to the factory's strict patterns.

Decoupling mirrors M1↔contract exactly: M2 reads the design output through
`parseGameDefinition` (read guard) and writes through `parseSpritePack` (write
boundary). The deterministic **compiler is the quality gate — there is no LLM critic**
(sprite validity is objective; the design critic exists only because *fun* is subjective).

## Approach

### New contracts (mirror `src/contracts/`)
- **`src/contracts/artSchemas.ts`** (mirrors `phaseSchemas.ts`) — internal phase I/O.
  `SpriteDsl` = the LLM output:
  ```
  SpriteOp  = z.string().regex(/^(rect \d+ \d+ \d+ \d+|oval \d+ \d+ \d+ \d+|line \d+ \d+ \d+ \d+|pixel \d+ \d+|mirror [HV])$/i)
  SpriteDsl = { gridSize: int 8..32 (default 12), frames: [{ ops: SpriteOp[] (1..40) }] (1..3), meta?: { entity } }.strict()
  ```
  Validating ops at the schema boundary (regex union) means malformed ops fail loud at
  `provider.structured`'s re-validate step, not silently in the compiler — replacing the
  prototype's permissive `normalizeDSL` salvage.
- **`src/contracts/spritePack.ts`** (mirrors `gameDefinition.ts`) — the published M2→M3
  contract. `zod/v4`, `.strict()`, `schemaVersion:'spritepack/v1'`. Reuses `EntityId`
  from `gameDefinition.ts` (DRY).
  ```
  SpriteMask   = boolean[][]          // [y][x]
  SpriteItem   = { gridSize, frames: SpriteMask[] (1..3), dsl: SpriteDsl }.strict()
  SpritePackV1 = { schemaVersion:'spritepack/v1', generatedAt: string, items: z.record(EntityId, SpriteItem) }.strict()
  ```
  `.superRefine` on `SpriteItem`: every frame is exactly `gridSize × gridSize`, and ≥1
  pixel set (M3's `renderEntity` must never get an empty mask). Export `parseSpritePack`
  read guard. **Retain the raw `dsl`** per item (cheap, self-describing, lets a viewer
  re-render without the LLM). `z.record(EntityId,…)` keys are already code-ready → **no
  key normalization** (reuse `entity.id` verbatim).

### Art modules (mirror `src/design/`)
- **`src/art/chains/types.ts`** — `SpriteGenInput = { entity: Entity, gameTitle: string, orientation: Orientation }.strict()`.
- **`src/art/chains/index.ts`** — `spriteChain = defineChain({ name:'sprite', promptFile:'prompts/art/sprite.prompt.md', inputSchema: SpriteGenInput, outputSchema: SpriteDsl, preset: 'structured' })`.
  **Reuse the `structured` preset** (Sonnet/medium) — constrained output, not ideation;
  no new preset (YAGNI). Override to Opus at the call site only if live runs show poor silhouettes.
- **`src/art/compiler.ts`** (the art analogue of `assembleGameDefinition.ts`) — pure,
  deterministic, no observer/LLM. `compileSprite(dsl): { gridSize, frames: boolean[][][] }`.
  Faithful typed port of `prototype/server/utils/sprites/dsl/compiler.js`:
  1. allocate `frames.length × s × s` false grids.
  2. per op: split/parse ints, clamp into grid, draw — `rect` (block), `pixel`,
     `line` (Bresenham), `oval` ((dx/rx)²+(dy/ry)²≤1), `mirror H|V` (reflect across midline).
  3. per-frame post-process (same constants): keep largest 4-neighbour connected component
     (BFS); density `>0.40` → thin (drop x%2||y%2), `<0.08` → dilate once.
  4. **empty-mask fallback**: if a frame is still all-false, set centre pixel
     `[floor(s/2)][floor(s/2)]` — guarantees the contract's ≥1-pixel refine never fails the
     phase on one bad frame.
- **`src/art/assembleSpritePack.ts`** (mirrors `assembleGameDefinition.ts`) — build `items`
  keyed by `EntityId`, set `schemaVersion`/`generatedAt`, return `parseSpritePack(...)`.
  Normalization already done in the compiler; this only assembles + validates (fail loud).
- **`src/art/runArtPhase.ts`** (mirrors `runDesignPhase.ts`):
  ```
  runArtPhase(game: GameDefinition, deps:{ provider, observer }): Promise<{ pack: SpritePack }>
  ```
  1. `const def = parseGameDefinition(game)` — read guard.
  2. **Parallel fan-out** over `def.entities` (the diverge analogue), each in its own
     `withNode(observer, \`sprite:${entity.id}\`, …)`: `sprite.run({entity, gameTitle, orientation})` → `compileSprite(dsl)`.
  3. `assembleSpritePack(items)`; `observer.progress('done', …)`; optionally `store.event` an ASCII preview per item.
- **`src/art/asciiPreview.ts`** — `maskToAscii(frames): string` (`#`/`·` rows) for trace/CLI eyeballing. No PNG dep (YAGNI).
- **`prompts/art/sprite.prompt.md`** (mirrors `elaborate.prompt.md`) — vars `{{entity}}`
  `{{gameTitle}}` `{{orientation}}` (must match `SpriteGenInput`). Body states the DSL output
  contract (the 5 ops verbatim, gridSize 12–16, 1–3 frames, one connected silhouette, fill
  8–40%, `mirror` as the last op of a frame).

### Entry point
- **`bin/art.ts`** (mirrors `bin/batch-design.ts` + `src/index.ts`) — load `.env`; read a
  cached `GameDefinition` from `runs/cache/design-games.json` (`CacheEntry[]`, select by
  index/traceId arg, then `parseGameDefinition(entry.game)`); build observer/store/usage as
  in `index.ts`; `runArtPhase`; `store.finalize({pack, timings, usage})`; print ASCII preview
  + traceId/cost. Fail loud if cache/key absent (same UX as `index.ts`).
- **`package.json`** — add `"art": "tsx bin/art.ts"`. **`Makefile`** — add an `art:` target. No new dependencies.

## Files
**New:** `src/contracts/artSchemas.ts`, `src/contracts/spritePack.ts`, `src/art/chains/types.ts`,
`src/art/chains/index.ts`, `src/art/compiler.ts`, `src/art/assembleSpritePack.ts`,
`src/art/runArtPhase.ts`, `src/art/asciiPreview.ts`, `prompts/art/sprite.prompt.md`,
`bin/art.ts`, plus tests below.
**Modified:** `test/helpers/fixtures.ts` (add `spriteDslFixture`, `spritePackFixture`),
`test/prompts/render.test.ts`, `test/e2e/live.test.ts`, `package.json`, `Makefile`.
**Untouched (OCP):** `defineChain`, `models.ts`, providers, observability, `gameDefinition.ts`.

## TDD (4 tiers, MockProvider-first, write the failing test first; CI runs 1–3)
- **T1 Contract** `test/contract/spritePack.test.ts` (mirrors `gameDefinition.test.ts`):
  accepts fixture; rejects unknown fields, wrong schemaVersion, bad `EntityId` key, frame
  dims ≠ gridSize², empty (all-false) item, frames len 0/>3, gridSize out of range;
  `SpriteDsl` rejects malformed op strings, accepts the 5 canonical ops.
- **T2 Prompt-render** extend `test/prompts/render.test.ts`: add `sprite.prompt.md` with an entity fixture → no leftover `{{var}}`.
- **T3 Mock orchestrator** `test/chain/runArtPhase.test.ts` (mirrors `runDesignPhase.test.ts`,
  zero network): `fromMap({ sprite: spriteDslFixture })` on `validGame` (2 entities) → `items`
  keys == entity ids; `observer.timings` has `sprite:block` + `sprite:player`, all ok;
  `usage.totals().calls===2`; every frame is gridSize² with ≥1 pixel; `schemaVersion==='spritepack/v1'`.
  Plus a pure `test/art/compiler.test.ts`: each op sets expected pixels; largest-component
  drops a stray pixel; density thin/dilate at boundaries; empty-mask fallback.
- **T4 Live e2e** extend `test/e2e/live.test.ts` (gated `RUN_REAL_LLM=1`): real provider on
  one cached `GameDefinition`; assert structural invariants only (`parseSpritePack` ok, one
  item/entity, frames non-empty & sized, cost tracked). Never assert exact pixels.

## Verification (end-to-end)
1. `npm run typecheck` && `npm run lint` clean.
2. `npm test` — tiers 1–3 green (red→green per file).
3. Mock dev run: `make art` (or `npm run art`) against a cached design → prints ASCII sprites, writes `runs/<traceId>/trace.json` with the pack.
4. Live: `RUN_REAL_LLM=1 npm run test:e2e`, and one real `make art` against `runs/cache/design-games.json` — eyeball the ASCII previews for recognisable, connected silhouettes; confirm cost/usage traced.
5. Optional cheap path: `PROVIDER=claude-code make art` to validate via subscription.

## Risks
- `EntityId` already normalized → no key-normalization step; `z.record(EntityId,…)` re-validates for free.
- Op validation lives at the schema boundary (regex union) → malformed ops fail loud; compiler still clamps in-range-but-oversized coords.
- Empty-mask fallback in the compiler guarantees the contract's ≥1-pixel refine never fails the phase.
- All frames share one top-level `gridSize`; the per-frame dimension refine enforces it; the prompt states it.
- `bin/art.ts` couples to the batch cache shape (`CacheEntry.game`); keep the read tolerant, fail loud if absent.
- `toPromptCapsule` is named in CLAUDE.md but unimplemented; M2 follows the actual M1 pattern (pass the `entity` object, let `renderPrompt` stringify it). Don't invent a capsule for one small object.
