# LLM Sprite Agent – Development Plan

Status: Draft
Branch: `feature/llm-sprite-generation`
Spec: `docs/specs/llm-sprite-agent.md`
Owner: Game Agent Team

## Objectives
- Implement an LLM agent that designs Atari‑style sprites using a tiny DSL.
- Compile DSL → boolean masks and render them instead of current placeholder figures.
- Keep runtime fast and deterministic (cache compiled sprites; no LLM in hot path).

## Deliverables
- SpriteDesignChain (LLM → SpriteDSL)
- DSL compiler (SpriteDSL → SpriteMask)
- Sprite pack cache (on disk, JSON)
- Renderer hook in game loop (drawSprite instead of primitives)
- Debug + test coverage

## Phases

### P0 – Scaffolding (1 day)
- Create chain: `server/agents/chains/art/SpriteDesignChain.js`
  - Input: `{ context: { entity, gridSize=12 } }`
  - Output: SpriteDSL JSON (validated)
- Prompt: `server/agents/prompts/art/sprite-dsl-generator.md` (few‑shot)
- Compiler: `server/utils/sprites/dsl/compiler.js` (finalize normalization + guards)
- Renderer: `server/utils/sprites/renderer.js` (mono, nearest‑neighbor)
- Registry entry: `server/utils/sprites/index.js` (exports compile/render helpers)

### P1 – Cache + Pack (0.5–1 day)
- Add pack store: `server/utils/sprites/packStore.js`
  - `loadPack(dir)`, `savePack(dir, pack)`
  - Default per game: `server/games/<id>/sprites.json`
- Cache key: `sha256(entity|grid|model|promptVer)`
- Flow: lookup pack → if miss → call chain → compile → pack.put → save

### P2 – Pipeline Integration (1 day)
- After `GameDesignChain` and before code generation:
  - For each `gameDef.entities[]`, compute canonical sprite key
  - Ensure a sprite exists in pack (generate on miss per P1)
  - Attach sprite pack path to the build artifact
- Frontend/runtime:
  - Load `sprites.json`
  - Replace placeholder draw calls with `renderEntity(ctx, name, x, y, scale, color, frame)` (uses sprites)

### P3 – Debug & Tools (0.5 day)
- Extend `/debug/sprites` to preview pack entries (search, frame playback)
- Add `/debug/sprites/generate?name=<entity>&grid=12` (gated by env) for on‑demand server‑side generation

### P4 – Testing (1 day)
- Unit tests: compiler (ops, bounds, mirrors), renderer (pixel counts), chain schema
- Integration tests: pipeline writes `sprites.json` and runtime loads it; golden ASCII snapshots

### P5 – Hardening (0.5 day)
- Alias mapping ("airplane"→"plane", "apple/pear"→"fruit")
- Metrics/logging for cache hits/misses and compile failures; emit debug summary
- No fallback: sprite generation errors or missing creds fail the build

## Config
- `OPENAI_API_KEY`, `OPENAI_MODEL` – required (build fails when missing)
- `SPRITE_GRID_SIZE=12` – default grid

## Risks & Mitigations
- Prompt drift → low temperature, strict examples, output schema
- Unreadable silhouettes → compiler checks (fill %, connectivity), fallback
- Runtime perf → pre‑load pack; optionally prerender to ImageBitmap on first use

## Validation / Acceptance
- Build any game: sprites for all entities exist (from cache or generation)
- Game renders mono blocky sprites; optional 2–3 frame flicker/animation
- With cache warm, no LLM calls occur when replaying builds

---

## Implementation Notes – How the Agent Will Be Created

1) Chain definition (`SpriteDesignChain`)
- Uses chainFactory `createJSONChain` with a Zod schema for the DSL response
- Prompt enforces: grid size, mono, ops list, fill ratio, 1–3 frames, recognizability
- Input: `{ context: { entity, gridSize } }`
- Output: `{ gridSize, frames: [{ ops: [...] }], meta: { entity } }`

2) Prompt engineering
- Few‑shot examples for plane, fruit, lantern, person
- Emphasis: Atari‑style, one color, small grid, connected silhouette, 2‑frame flicker optional
- Strict "JSON only" response

3) Compile & validate
- `compileSpriteDSL(dsl)` → SpriteMask
- Guards: clamp to grid, cap frames (≤3), ensure ≥1 op per frame, fill% [8%, 40%], simple connectivity
- On failure: retry N times; on repeated failure: placeholder

4) Caching (sprite pack)
- Lookup before generation; save after successful compile
- Pack format: `{ gridSize: 12, items: { [name]: { frames: boolean[][][] } } }`

5) Pipeline integration
- Add an ensure‑sprites step post‑design/pre‑codegen
- Attach pack path to game build; load at runtime and render via `drawSprite`

6) Debug + tools
- `/debug/sprites` page preview; optional server route for generation (behind env)

7) Tests
- MockLLM for chain; golden ASCII snapshots; compiler/renderer unit tests; integration pack write/read
