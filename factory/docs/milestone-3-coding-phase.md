# Milestone 3 — The Coding Phase

## Context
M1 (design) produces a validated `GameDefinition`; M2 (art) produces a validated
`SpritePack`, one sprite per entity. The contract orders M3 next —
[`EntityId`](../src/contracts/gameDefinition.ts) is "Shared by design, art (M2),
**coding (M3)**". M3 is the **coding phase**: from a `GameDefinition` + its
`SpritePack`, autonomously generate a **playable browser game** and emit a new
versioned artifact, `GameBundleV1` — the final output of the factory.

**Goal:** from `{ game, pack }`, produce a self-contained bundle (an `index.html`
plus `game.js` and assets) that runs in a browser, renders the entities with their
M2 sprites, and is controlled by the fixed virtual gamepad — fully autonomous.

**Approach:** the LLM authors **only `game.js`** against a fixed runtime contract;
everything else (HTML shell, gamepad control bar, sprite runtime, inlined sprite
data) is **deterministic templating**. The **quality gate** has two parts, because
two different things are being judged, and they carry **different authority**:
- **Hard floor (objective, deterministic, cheap):** `game.js` compiles, passes the
  static lint, and **loads + runs N frames in a headless browser without throwing**
  (the smoke test). This is the only thing that can fail the phase — the trustworthy
  floor that separates *iterable* from *broken*.
- **Soft signals (recorded, drive the repair loop, never block):** *interaction*
  (gamepad input changes what's drawn), *progression* (something changes over time —
  low-confidence, see Risks), and *faithfulness* (a lightweight LLM reviewer judges
  whether the code builds the loop and goal the `GameDefinition` describes — the same
  subjective gap the design critic exists for). These diagnose; they don't gatekeep.

A **bounded repair loop** feeds every failing check back to the LLM and **keeps the
best candidate** across iterations (mirrors the design phase). The phase returns
`{ bundle, report }` — the best attempt plus a structured verdict — and **fails loud
only when no loading bundle can be produced at all** (the `runDesignPhase` `!best`
analog). Because the factory is what you iterate on, not individual games, a sub-bar
run must still hand you the near-miss + a diagnosis, not an exception; hard
enforcement (CLI exit code, e2e assertion) lives in the hosts.

Decoupling mirrors M1↔M2 exactly: M3 reads its inputs through `parseGameDefinition`
+ `parseSpritePack` (read guards) and writes through `parseGameBundle` (write
boundary). M3 is a phase consumed like the others — exported from
[`src/api.ts`](../src/api.ts), driven through the generic seams, **nothing
M3-specific leaks elsewhere** (see [consumer-boundary.md](./consumer-boundary.md)).

## The runtime contract (what `game.js` may rely on)
Ported and tightened from the prototype's boilerplate, aligned to our gamepad:
- A canvas `#game-canvas` (sized by the shell; `game.js` reads `canvas.width/height`,
  never sets them).
- **Input:** `window.gamepadState` — `{ up, down, left, right, btn1, btn2 }` booleans,
  updated from `gamepad-press`/`gamepad-release` events fired by the control bar.
  **Exactly the `GamepadInput` enum** — no keyboard/pointer assumptions.
- **Sprites:** `renderEntity(ctx, '<entityId>', x, y, scale, color, frame)` draws an
  entity's M2 mask via `drawSpriteMono`; sprite data is provided on `window.spritePack`.
  `game.js` must use canonical `entity.id`s verbatim (the contract's whole point).
- Atari constraints (deterministic-lintable): no full-canvas clear, basic colours
  only, no network/eval, a clear win/lose/goal state per `game.goal`.

## Approach

### New contracts (mirror `src/contracts/`)
- **`src/contracts/codeSchemas.ts`** (mirrors `phaseSchemas.ts`) — internal phase I/O.
  `GameCode` = the LLM output: `{ js: z.string().min(1), summary: z.string().optional() }.strict()`.
  Validating only that `js` is non-empty here; *correctness* is enforced by the
  gate, not the schema (you can't regex "it runs", let alone "it plays").
  `CodeReview` = the faithfulness reviewer's output: `{ verdict: 'pass'|'revise',
  issues: { target, note }[] }.strict()` (mirrors the design `Critique`).
  `CodeFeedback` (for the repair loop) = `{ js, issues: string[] }` — the union of
  execution-gate failures and review issues.
  `CodeReport` = the gate's verdict, returned by the phase: `{ passed: boolean,
  checks: { syntax, lint, smoke, interaction, progression, faithful: boolean },
  issues: string[] }.strict()` — `passed` is true only when **every** check passed.
- **`src/contracts/gameBundle.ts`** (mirrors `spritePack.ts`) — the published artifact.
  `zod/v4`, `.strict()`, `schemaVersion:'gamebundle/v1'`. Reuses nothing it shouldn't.
  ```
  GameFile     = { path: string, contents: string }   // path is a relative filename
  GameBundleV1 = { schemaVersion:'gamebundle/v1', generatedAt, gameId, entry:'index.html',
                   files: GameFile[] (≥3) }.strict()
  ```
  `.superRefine`: `files` includes `entry`, `game.js`, and the inlined sprite-data
  script; paths unique; no empty contents. Export `parseGameBundle` read guard.

### Coding modules (mirror `src/design/` + `src/art/`)
- **`src/coding/chains/types.ts`** — `CodeGenInput = { game, spriteNames: string[], runtimeContract: string }.strict()`,
  `CodeFixInput = { game, priorJs: string, issues: string }.strict()`, and
  `CodeReviewInput = { game, js: string }.strict()`. Pass the typed `game`; the prompt
  renderer stringifies it (the M1/M2 pattern — no capsule).
- **`src/coding/chains/index.ts`** — `codeGenChain`, `codeFixChain`, and `codeReviewChain`
  via `defineChain`. Gen/fix use `outputSchema: GameCode`, **preset `structured`**
  (constrained authoring); review uses `outputSchema: CodeReview`, **preset `validation`**,
  overridden to Opus at the call site (judgment quality, like the design critic).
- **`src/coding/templates/`** — the deterministic, LLM-free runtime: `index.html`
  (title injected), `controlBar.{js,css}` (renders the fixed 6-input gamepad, fires the
  press/release events), `spriteRuntime.js` (`renderEntity`/`drawSpriteMono`/`getSprite`),
  and a minimal `background.js`. Static files, version-controlled, unit-tested for the
  contract `game.js` depends on.
- **`src/coding/sandbox.ts`** — runs an assembled bundle in a **real headless browser**
  (Playwright/Chromium; see the dependency note). A DIY `node:vm` DOM/canvas stub was
  rejected: generated code reaches for unpredictable APIs (`measureText`, `Image`,
  `performance.now`, `getBoundingClientRect`…) and every missing one is a *false reject*
  of a good game. The sandbox loads the bundle, **seeds `Math.random`/`Date.now`/`rAF`
  for reproducibility**, records the 2D-context draw calls, and runs two passes:
  1. **idle** — N frames, no input.
  2. **input** — N frames while a scripted gamepad sequence is injected (dispatch the
     `gamepad-press`/`gamepad-release` events).
  Returns `{ ok, error?, idleDraws, inputDraws, movedEntities, usedEntities }`.
- **`src/coding/gate.ts`** — computes a `CodeReport`; **never throws**. Two tiers of
  authority:
  - **Hard floor (deterministic, no LLM) — the only checks that can fail the phase:**
    1. **syntax** — compile `game.js` (catch `SyntaxError`, no execution).
    2. **static lint** — forbidden patterns (full-canvas fill, `eval`, `fetch`/`import`,
       non-allowed colours) and required ones (`gamepadState`, `renderEntity`, only
       `game.entities[].id` passed to `renderEntity`).
    3. **smoke** — `sandbox.ts`: loads + runs N idle frames with **no thrown error**
       (`sandbox.ok`). The best predictor of "I can open and judge it."
  - **Soft signals (recorded in `report`, drive the repair loop, never block):**
    4. **interaction** — the input pass's draw output **differs** from the idle pass.
    5. **progression** — something changes over frames (entity-position deltas under
       input preferred; **low-confidence** — see Risks).
    6. **faithfulness (LLM)** — `codeReviewChain` judges whether `game.js` implements
       the `loop`, `mechanics`, and `goal`; runs **only after the smoke floor passes**.
  Returns `CodeReport` (`passed` = every check passed; `issues` = all failing signals).
- **`src/coding/assembleGameBundle.ts`** (the write boundary, deterministic) — compose
  `files` from the templates + the LLM `game.js` + an **inlined** `sprites.data.js`
  (`window.spritePack = {…}` built from the `SpritePack`, so the bundle runs from
  `file://` with no fetch), inject `title`, then `parseGameBundle(...)` (fail loud).
- **`src/coding/runCodePhase.ts`** (mirrors `runArtPhase` + design's refine/keep-best loop):
  ```
  runCodePhase(game, pack, deps:{ provider, observer, modelOverride? }):
    Promise<{ bundle: GameBundle, report: CodeReport }>
  ```
  1. `parseGameDefinition(game)` + `parseSpritePack(pack)` — read guards.
  2. `withNode('code:generate', …)` → `codeGenChain.run` → `assembleGameBundle` →
     `gate` (hard floor, then soft signals; faithfulness only if the smoke floor passed).
  3. While `!report.passed` and `iteration < maxIterations` (default 3), driven by
     **any** failing check: `withNode('code:fix#n', …)` →
     `codeFixChain.run({ priorJs, issues })` → reassemble → re-gate. Track the **best**
     candidate across iterations via a `candidateScore` (floor-pass → more soft checks
     passed → fewer issues), mirroring [`refinementRouter.ts`](../src/design/refinementRouter.ts).
  4. Return `{ bundle: best.bundle, report: best.report }` (`observer.progress('done', …)`).
     **Throw only if `best` still fails the hard floor** (no loading bundle — the
     `runDesignPhase` `!best` analog). A sub-bar-but-running game returns with
     `report.passed:false`; the host decides what to do with it.

### Prompts (mirror `prompts/art/`)
- **`prompts/coding/codeGen.prompt.md`** — vars `{{game}}` `{{spriteNames}}` `{{runtimeContract}}`.
  States the runtime contract verbatim (canvas, `gamepadState`, `renderEntity` with the
  allowed entity ids, Atari constraints, win/lose per `goal`), and "output only `game.js`".
- **`prompts/coding/codeFix.prompt.md`** — vars `{{game}}` `{{priorJs}}` `{{issues}}`.
  "Fix exactly these issues; keep what works" (the design-refine ethos).
- **`prompts/coding/codeReview.prompt.md`** — vars `{{game}}` `{{js}}`. A skeptic that
  checks the code builds the specified loop/mechanics/goal and the input actually drives
  them; reject by default (mirrors `critic.prompt.md`).

### Entry point
- **`bin/code.ts`** (mirrors `bin/art.ts`) — load `.env`; read a cached `GameDefinition`
  (`runs/cache/design-games.json`, by `I=`/`TRACE=`); obtain its `SpritePack` (run
  `runArtPhase` inline, or load a given art `trace.json`); `runCodePhase`; **always**
  write the bundle files under `runs/<traceId>/game/` (pass or fail) so `make play`
  works on near-misses; `store.finalize` (persists the `report` into the trace, **not**
  into the bundle's `files[]`); print the path, the report, and cost; **exit non-zero
  when `!report.passed`**.
- **`make play TRACE=<id>`** — serve `runs/<traceId>/game/` over a tiny `node:http`
  static server for eyeballing in a browser. `package.json`: add `"code"` + `"play"`;
  **`Makefile`**: `code:` and `play:` targets.
- **`src/api.ts`** — export `runCodePhase`, `GameBundleV1`/`parseGameBundle`, `CodeReport`, types.

### Dependency note (this milestone adds one)
The gate needs a real browser to judge whether a game *plays*, so M3 takes a dev
dependency on **Playwright** (Chromium). This is a deliberate exception to the
factory's no-new-deps default, made because the hand-rolled `node:vm` alternative
produces false rejects (it can't faithfully emulate canvas/DOM for arbitrary code).
It is confined to `src/coding/sandbox.ts` (one adapter), dev-only, and the rest of the
factory still depends on nothing new. CI runs headless Chromium; tiers 1–3 that need a
browser are skippable where Chromium isn't installed (the live e2e always uses it).

### Admin (follow-up, not core to this milestone)
Once M3 lands, the admin gains a third **Code** panel chaining from an art run
(design→art→code), previewing the bundle in a sandboxed `<iframe srcdoc>` alongside the
gate `report`. It consumes
`runCodePhase` + the new contract through `src/api.ts` only — **no core change**, exactly
like the design/art panels.

## Files
**New:** `src/contracts/codeSchemas.ts`, `src/contracts/gameBundle.ts`,
`src/coding/chains/{types,index}.ts`, `src/coding/templates/*`, `src/coding/sandbox.ts`,
`src/coding/gate.ts`, `src/coding/assembleGameBundle.ts`, `src/coding/runCodePhase.ts`,
`prompts/coding/{codeGen,codeFix,codeReview}.prompt.md`, `bin/code.ts`, plus tests below.
**Modified:** `src/api.ts` (export the phase + contract), `test/helpers/fixtures.ts`
(add `gameCodeFixture`, `gameBundleFixture`), `test/prompts/render.test.ts`,
`test/e2e/live.test.ts`, `package.json` (+ Playwright dev dep), `Makefile`.
**Untouched (OCP):** `defineChain`, `models.ts`, providers, observability, the M1/M2
contracts, every existing CLI and the admin.

## TDD (4 tiers, MockProvider-first, write the failing test first; CI runs 1–3)
- **T1 Contract** `test/contract/gameBundle.test.ts`: accepts a fixture bundle; rejects
  unknown fields, wrong `schemaVersion`, missing `entry`/`game.js`/sprite-data file,
  duplicate paths, empty contents. `GameCode` rejects empty `js`.
- **T2 Prompt-render** extend `test/prompts/render.test.ts`: `codeGen`/`codeFix`/`codeReview`
  render with fixtures → no leftover `{{var}}`.
- **T3 Mock orchestrator** `test/chain/runCodePhase.test.ts` (zero network for the LLM;
  the gate's browser is real): a good `gameCodeFixture` ⇒ `report.passed`, one
  `code:generate` node, bundle valid, sprite ids present. A scripted `[deadJs, goodJs]`
  where `deadJs` runs but ignores input ⇒ `interaction` fails on iter 0, exactly one
  `code:fix#1`, then `passed`; **keep-best returns the good one**. A scripted review
  `[revise, pass]` with running code ⇒ one fix on a faithfulness issue, then `passed`. A
  **persistently-bad-but-running** fixture ⇒ **returns** `{ bundle, report }` with
  `report.passed:false` after `maxIterations` (no throw). A **non-loading / syntax-broken
  even after the fix** fixture ⇒ **throws** (the only fail-loud case).
- **Gate/sandbox units (real Chromium):** `test/coding/gate.test.ts` (syntax error caught;
  forbidden pattern flagged; unknown entity id flagged) and `test/coding/sandbox.test.ts`
  (a known-good interactive `game.js` → `inputDraws` differ from `idleDraws` and an entity
  moves; a dead one that ignores input → interaction fails; a throwing one → `ok:false`).
  These are gated on Chromium being present so a bare CI still runs the rest.
- **T4 Live e2e** extend `test/e2e/live.test.ts` (gated `RUN_REAL_LLM=1`): real provider
  on one cached `{game, pack}`; assert structural invariants only — `parseGameBundle` ok,
  **`report.passed`** (all checks), cost tracked. Never assert exact code.

## Verification (end-to-end)
1. `npm run typecheck` && `npm run lint` clean.
2. `npm test` — tiers 1–3 green (red→green per file).
3. Mock dev path: `runCodePhase` with a mock `GameCode` against a cached `{game, pack}` →
   bundle written, `report` populated, the full gate runs in the headless browser.
4. Live: `RUN_REAL_LLM=1 npm run test:e2e`, then `make code` against a cached design and
   `make play TRACE=<id>` — open the browser, confirm the game renders the M2 sprites,
   responds to the on-screen gamepad, and reaches its goal/fail state; read the printed
   `report`. Confirm cost traced. Repeat on a few cached designs to gauge the gate's
   signal quality and tune thresholds.
5. Cheap path: `PROVIDER=claude-code make code`.

## Risks
- **"Plays" ≠ "fun".** The gate proves the game runs, responds to input, and progresses,
  and the reviewer proves it matches the spec — none of that proves it's *fun* (real fun is
  emergent, as the PRD says). M3's bar is *playable and faithful*, not *fun*. The `make
  play` eyeball stays the final judgment.
- **The interaction/progression checks are heuristic (now soft).** "Input changes the
  draw output" and "something moves" catch dead games but can be gamed — and the ported
  `background.js` animates every frame, so progression false-*passes* by default, while
  idle `goal:'survive'` games false-*fail*. Prefer entity-position deltas under input,
  weight progression as low-confidence, and treat both as soft signals, not proofs.
- **Browser dependency / flakiness.** Playwright adds weight and headless runs can be
  timing-sensitive; seed `random`/time/`rAF` and assert over a window of frames, not one.
  Confined to `sandbox.ts`; gate the browser-using tests on Chromium being installed.
- **One-shot vs incremental.** First cut generates `game.js` in one shot + the repair loop.
  If quality is poor for richer games, an incremental build-plan/step loop (prototype-style)
  is a later enhancement — **YAGNI** until shown necessary.
- **Ship-best + diagnose, fail loud only when worthless.** The phase returns the best
  attempt + a `report` (keeping the least-bad candidate, like the design phase) and throws
  only when no loading bundle can be produced. Hard enforcement of "good enough" lives in
  the hosts (`bin` exit code, e2e assertion). Trade-off — **silent sub-bar:** a careless
  host could ship a `report.passed:false` bundle; mitigated by the `bin` exit code, the
  e2e assertion, and the admin always rendering the report.
- **Seeded gate vs unseeded `make play`.** The gate seeds `Math.random`/`Date.now`/`rAF`
  for reproducibility, but `make play` runs unseeded in a real browser — the gate judges a
  *different* execution than the one you eyeball. Another reason the subjective checks are
  soft (smoke + report + human eyeball is the real loop).
- **Sprite-data shape.** The runtime reads `gridSize`/`frames`; the assembler maps the
  `SpritePack` items (id → `{gridSize, frames}`) verbatim — ids are already canonical, so
  no key normalization (same guarantee M2 relies on).
