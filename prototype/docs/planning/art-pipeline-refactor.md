# Sprite Pack Creation – Controller Orchestration

Status: Proposal
Owner: Game Agent Team
Related: `docs/specs/llm-sprite-agent.md`, `docs/planning/llm-sprite-agent-plan.md`

## Goal

Introduce a dedicated Art pipeline (like Coding) that the controller invokes to create `sprites.json` alongside `game.js`. Keep LLM usage normalized (chains + centralized schemas) and retain unified tracing. Controller remains responsible for materializing build outputs.

## Target Architecture

- Domain
  - GameDef: final design object from `GameDesignChain`.
  - SpriteSpec: canonical SpriteDSL + compiled SpriteMask.
- Application (Pipelines)
  - PlanningPipeline: outputs `GameDef`.
  - ArtPipeline (new): ensures `sprites.json` for all entities.
  - CodingPipeline: generates `game.js`.
  - Controller: invokes ArtPipeline and writes `sprites.json` to the game folder.
  - Orchestrator: may later run Planning → Art → Coding when output path is known.
- Infrastructure
  - Chains: `SpriteDesignChain` (LLM → DSL) + existing design/coding chains.
  - Services: `SpriteMaskGenerator` (alias + chain + compile), `PackStore` (load/save), tracing via `chainFactory`.
  - Config: env + centralized schemas.
- Interface
  - Runtime helpers: `renderEntity`/`drawSpriteMono` + spritePack loader (already added).
  - Debug UI: `/debug/llm` (traces) + `/debug/llm-sprites` (generate/preview).

## Key Changes (low churn)

- Add ArtPipeline: `server/agents/pipeline/artPipeline.js` with progress steps and summary.
- Controller calls ArtPipeline after writing `game.js`; passes `sharedState.spritePackPath`.
- Input: `sharedState.gameDef`; output: on-disk sprite pack and status events.
- For each entity: call `SpriteMaskGenerator` (LLM → DSL → Mask) and persist via `PackStore`.
- Normalize LLM usage + tracing via `chainFactory`; pass `sharedState` for token counting.
- Centralize schemas (SpriteDSL via `server/schemas/langchain-schemas.js`).
- Keep fail-hard semantics on errors and missing creds.

## Minimal Refactor Plan

1) Add ArtPipeline module
- File: `server/agents/pipeline/artPipeline.js`
- Steps: Prepare pack (20%), per-entity generation (80% split evenly).
- Emits `PipelineStatus` and `SpritesSummary`.

2) Controller invokes ArtPipeline
- Set `sharedState.spritePackPath = <gameFolder>/sprites.json` and call `runArtPipeline(sharedState, onStatusUpdate)`.

3) Wire sharedState into `SpriteDesignChain`
- Service: `SpriteMaskGenerator` owns LLM calls.
- Initialize `sharedState = { tokenCount: 0, traceId }`.
- Create chain with `createSpriteDesignChain(llm, { sharedState })`.

4) Optional: remove explicit `addLlmTrace` in generator once `chainFactory` traces confirm.

5) Update docs as needed; keep “build fails if creds missing”.

## Files to Add / Update

- Update
  - `server/utils/sprites/llmGenerator.js` → `server/agents/chains/art/SpriteMaskGenerator.js` (alias + sharedState)
  - `server/agents/chains/art/SpriteDesignChain.js` (ensure centralized schema + sharedState tracing)
- Keep
  - `server/utils/sprites/packStore.js` (load/save)
  - Runtime helpers (sprite loader + `renderEntity`/`drawSpriteMono`)

## Service Boundaries

- SpriteMaskGenerator (`server/agents/chains/art/SpriteMaskGenerator.js`)
  - `normalizeAlias(entity)` → canonical name.
  - `ensureDSL(llm, context)` → SpriteDSL via `SpriteDesignChain`.
  - `compileToMask(dsl)` → SpriteMask (boolean frames) using compiler.
- PackStore
  - `loadPack(dir)`, `savePack(dir, pack)`; default `server/games/<id>/sprites.json`.

## Schemas & Tracing

- Centralized schema: `spriteDslSchema` in `server/schemas/langchain-schemas.js`.
- `SpriteDesignChain` uses `createJSONChain` with schema + model.
- Pass `sharedState` into chain for token counting and trace correlation.
- Disable/remove bespoke trace plumbing once `chainFactory` traces visible in `/debug/llm`.

## Shared State Shape

```ts
type SharedState = {
  gameDef?: GameDef;
  spritePackPath?: string;
  tokenCount: number;
  traceId?: string;
};
```

## Orchestration & Events

- Controller emits:
  - `PipelineStatus` updates (as today) and a `SpritesSummary` with counts, cache hits/misses, output path.

## Short‑Term Validation

- Env: `ENABLE_DEBUG=1 ENABLE_DEV_TRACE=1`.
- Run a build; verify:
  - `/debug/llm` shows `SpriteDesignChain` traces with `tokenDelta`.
  - Game folder contains `sprites.json`; runtime loads pack and renders via `renderEntity`.
  - Missing creds or generation failures cause the build to fail.

## Notes / Rationale

- Separation of concerns: Controller only orchestrates; ArtPipeline owns sprite generation.
- Testability: ArtPipeline unit/integration tests like Planning/Coding.
- Observability: Traces/metrics via `chainFactory` + PipelineTracker.
- Consistency: Centralized schemas; all chains receive sharedState for tokens/traces.
- Extensibility: Easy to add palette/sheet emitters or multi‑frame rules without controller changes.
