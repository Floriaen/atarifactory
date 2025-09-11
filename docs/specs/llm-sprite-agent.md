# LLM Sprite Agent – Short Specification

Status: Draft
Branch: `feature/llm-sprite-generation`
Owner: Game Agent Team

## Goal

Generate Atari‑style entity sprites via an LLM agent and render them in place of today’s simple figures. Sprites must be:
- Flat, one solid color (plus transparent background)
- Very low‑res (default 12×12; allow 16×16)
- Pseudo‑animated (1–3 frames)
- Simple but recognizable silhouettes (e.g., helicopter, lantern, person), comparable to the example screenshot

## Non‑Goals

- No multi‑color shading or outlines in this iteration
- No large canvases or high‑res art

## Overview

We use the LLM as a designer that outputs a tiny DSL describing the silhouette; our compiler renders deterministic boolean masks; the renderer draws them on canvas with a chosen color. Runtime remains fast and cheap (no LLM in the hot path if sprites are cached).

## Interfaces

### Chain

- Name: `SpriteDesignChain`
- Location: `server/agents/chains/art/SpriteDesignChain.js`
- Prompt: `server/agents/prompts/art/sprite-dsl-generator.md`
- Input (`context`):
  - `entity`: string (e.g., "plane", "lantern", "person")
  - `gridSize`: 12 (default) or 16
  - Optional: style hints ("atari", "flat", "one color", etc.)
- Output (JSON, validated):
  ```json
  {
    "gridSize": 12,
    "frames": [ { "ops": ["rect 3 6 6 1", "rect 1 6 10 1", "pixel 2 6"] } ],
    "meta": { "entity": "plane" }
  }
  ```

### DSL (SpriteDSL)

- Grid: 12 or 16
- Frames: 1–3
- Ops (in frame order):
  - `rect x y w h`
  - `oval cx cy rx ry`
  - `line x1 y1 x2 y2` (Bresenham)
  - `pixel x y`
  - `mirror H|V`
- Constraints: mono (no colors in data), connected silhouette preferred, fill ratio ~10–40% of pixels.

### Compiler

- Location: `server/utils/sprites/dsl/compiler.js`
- Input: SpriteDSL JSON
- Output: `SpriteMask` = `{ gridSize: number, frames: boolean[][][] }`
- Enforces bounds, clamps values, and guarantees at least one op per frame.

### Renderer

- Location: `server/utils/sprites/renderer.js`
- API: `drawSprite(ctx, mask, color, x, y, scale, frameIndex)`
- Behavior: nearest‑neighbor block fill per true pixel; mono color supplied at draw time.

## Integration Points

1) Where in the pipeline
- After `GameDesignChain` (once entities are known) and before code generation.
- For each entity in `gameDef.entities`, request/create a sprite:
  - If cached in sprite pack: use cached
  - Else call `SpriteDesignChain` → compile → cache

2) Emission into game build
- Write compiled masks to the game’s assets as JSON or JS module (e.g., `assets/sprites.json`).
- At runtime, load masks and call `drawSprite` in the existing render loop instead of drawing primitives.

3) Replacement policy
- Map `gameDef.entities[]` to a canonical sprite key (e.g., "guard" → "person").
- Unknown entities: fallback to a generic placeholder or the nearest known archetype.

## Caching & Determinism

- Cache key: `sha256(entity|gridSize|model|promptVersion)`
- Store compiled masks on disk in a sprite pack (per game) or a global cache folder.
- Default mode: prefer cache; call LLM only on cache miss.

## Configuration

- `OPENAI_API_KEY` / `OPENAI_MODEL`: required (build fails when missing)
- `SPRITE_GRID_SIZE`: default 12
- Optional cache knobs (future): global sprite pack reuse

## Error Handling

- If LLM output fails validation/compilation: retry up to N times (low temperature)
- On repeated failure or missing credentials: the build fails with a clear error (no placeholder fallback)

## Testing

- Unit: compiler ops/bounds; renderer pixel counts; DSL validation
- Golden snapshots: ASCII masks for a small set (plane, lantern, person, tree)
- Integration: run chain with known entities; ensure masks compile and are attached to the build
- Manual: `/debug/sprites` page to view rendered masks per entity

## Performance Targets

- Compile time per sprite: < 50ms
- Draw 50 sprites per frame at 60 FPS on mid‑tier CPU (with small caches or prerendered ImageBitmap)

## Acceptance Criteria

- Given a game with entities and valid credentials, sprites are generated (or fetched from cache), compiled, and rendered instead of placeholder figures.
- Sprites are flat, one‑color, low‑res, and recognizable; optional 2–3 frame flicker/motion for pseudo‑animation.
- No LLM calls occur during gameplay when cache is warm.
