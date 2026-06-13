# Background System Plan (Atari‑style)

Owner: add-game-background branch
Status: Draft → Implementable

## Objective
Add a deterministic, low‑CPU, Atari‑style background system that adapts to the generated game genre without external assets. Backgrounds render via boilerplate code and are driven by a BackgroundSpec produced in the Design phase.

## Outcomes
- Consistent Atari look: saturated palette, chunky pixels, hard edges, simple dithers.
- Genre‑aware presets (maze/space/platform/tower/etc.).
- Deterministic visuals via seeded RNG; mobile‑friendly performance.
- Zero coupling to gameplay logic; generated code only calls a tiny API.

## Architecture
- Design phase chain: `BackgroundSpecChain` produces `gameDef.backgroundSpec`.
- Controller: persists/injects the spec and copies boilerplate:
  - `background.js` (runtime), `gfx.js` (helpers).
  - Optionally `background.json` if not inlined.
- Boilerplate wiring (in `game.html`):
  - `<script src='gfx.js'></script>`
  - `<script src='background.js'></script>`
  - `<script src='sprites.js'></script>`
  - `<script src='game.js'></script>`
- Game loop usage (in `game.js`):
  - Init: `const bg = Background.createBackground(ctx, window.backgroundSpec || {/* fallback */}, canvas);`
  - Loop: `bg.update(dt); bg.draw(ctx);` before entities.

## Spec Model
BackgroundSpec fields (stored under `sharedState.gameDef.backgroundSpec`):
- `type`: `none | starfield | parallax | tower | scanlines | net | road | grid`
- `palette`: string[] hex colors
- `params`: per‑type options (e.g., `seed`, `starCount`, `layers`, `scrollSpeed`, `tileSize`)
- `layerColors`: optional per‑layer colors

Add to Zod (`server/schemas/langchain-schemas.js`): `backgroundSpecSchema` and include in `finalAssemblerSchema.gameDef` (non‑breaking optional field).

## Presets (Genre → Type)
- Maze: `none` or solid dark
- Space shooter: `starfield` (2 bands, twinkle)
- Platformer: `parallax` (2–3 layers: hills/forest/city)
- Tower/vertical: `tower` (repeating pillars, vertical drift)
- Breakout: `scanlines` or diagonal stripes
- Pong: `net` (center dashed, borders)
- Racer/top‑down: `road` (trapezoid, dashed center)
- Fallback: `grid` (8–12px cell)

## Implementation Tasks
1) Schema and Chain
- Add `backgroundSpecSchema` to `server/schemas/langchain-schemas.js` (optional on gameDef).
- Implement `BackgroundSpecChain` using `createStandardChain()` and prompt.
- Integrate in orchestrator after Playability validation, before Planner/Coding.

2) Boilerplate + Runtime
- Add `server/gameBoilerplate/background.js` with `Background.createBackground(ctx, spec, canvas)` returning `{ update(dt), draw(ctx) }` supporting: `none, starfield, parallax, tower, scanlines, net, road, grid` and include merged gfx helpers.
- Update `server/gameBoilerplate/game.html` to include `gfx.js` and `background.js` before `game.js`.
- Update `server/gameBoilerplate/game.js` template to: init background and call `update/draw` in loop.

3) Controller Integration
- Copy `background.js` when writing a game.
- Inject `window.backgroundSpec = ...` (or write `background.json` and lazy‑load).
- Add heuristic fallback builder if `gameDef.backgroundSpec` is missing (derive from title/loop/entities).

4) Tests
- Unit: schema validation for `backgroundSpecSchema`.
- Unit: starfield determinism (same seed → same layout), wrap logic, band speeds.
- Unit: parallax layer counts, speeds, snapping.
- Integration: controller includes scripts; background initializes and draws (canvas mock), no throws.

5) Docs
- Update `AGENT.md` with short guidance on backgrounds (where spec lives, how to call).
- Add minimal example specs to `docs/examples` if desired.

## Acceptance Criteria
- All existing tests pass; new tests added for schema + runtime helpers.
- Generated game loads and renders background without changing gameplay logic.
- Background selection aligns with genre presets or provided spec.
- Performance: ≤ 1ms/frame for backgrounds on typical desktop; mobile acceptable.

## Risks & Mitigations
- Chain omission: provide controller heuristic fallback.
- Visual noise in mazes: default to `none` for maze‑like games.
- Palette clash with sprites: allow palette override via spec.

## Milestones
- M1: Schema + Chain scaffold (spec in sharedState)
- M2: Boilerplate files + template wiring
- M3: Controller integration + heuristic fallback
- M4: Tests passing, visual smoke check

## Rollout
- Behind branch `add-game-background`.
- After merge, enable in orchestrator by default; can toggle chain via env if needed.
