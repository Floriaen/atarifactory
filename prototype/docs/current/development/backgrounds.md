# Atari-Style Backgrounds

This doc explains how backgrounds are generated and wired into each delivered game now that the boilerplate `background.js` has been removed. No changes needed in AGENT.md.

## Overview
- Coding pipeline owns background creation. `BackgroundCodeChain` emits per-game code and stores it on `sharedState.backgroundCode`.
- The controller persists that code as `background.js` in the game bundle (no controller heuristics; failure if missing outside MOCK mode).
- Boilerplate `game.js` expects `window.Background.createBackground(ctx, canvas)` to be present and drives `update(dt)` then `draw(ctx)` each frame.

## Schema
Produced by `BackgroundCodeChain` and validated by `backgroundCodeSchema`:
- `fileName`: typically `background.js`
- `code`: JavaScript defining `window.Background.createBackground(ctx, canvas)` and returning `{ update(dt), draw(ctx) }`
- `notes`: optional metadata for observability

Location: `server/schemas/langchain-schemas.js:backgroundCodeSchema`.

`codingPipeline` passes a distilled game context (title, description, mechanics, entities, winCondition) into the chain via a single `context` variable.

## Pipeline Flow
- Step 1 of `runCodingPipeline` executes `BackgroundCodeChain` (skipped only when `MOCK_PIPELINE=1`).
- Successful runs set `sharedState.backgroundCode`; controller serializes it with code-fence stripping before other assets.
- Files of interest: `server/agents/chains/coding/BackgroundCodeChain.js`, `server/agents/pipeline/codingPipeline.js`, `server/controller.js`.

## Runtime
- `server/controller.js` persists `background.js`; absence throws (unless in MOCK).
- Template includes `<script src='background.js'></script>` before `game.js`: see `server/gameBoilerplate/game.html`.
- `server/gameBoilerplate/game.js` has no fallback: it immediately calls `window.Background.createBackground(ctx, canvas)` and expects `{ update, draw }`.

## Supported Types (prompted examples)
- `none`: solid/no-op background
- `starfield`: moving stars with speed bands
- `parallax`: 2–3 scrolling silhouette layers
- `grid`: 8–12 px grid lines
- `scanlines`: every other row darkened
- `net`: dashed center line, court borders
- `road`: simple trapezoid road with dashed center
- `tower`: repeating vertical pillars with vertical drift

All types are CPU-light and avoid gradients; visuals are chunky/pixelated.

## Fallback Logic
None. There is no baked-in `background.js`. Missing or empty code triggers a controller error (mock pipeline skips the check).

## Extending
- Adjust `server/agents/prompts/coding/BackgroundCodeChain.prompt.md` to encourage new styles or tune descriptions.
- Keep rendering simple (rectangles/lines), deterministic (seeded RNG), and Atari-like.
- Consider schema tweaks if we ever add extra metadata—update `backgroundCodeSchema` in lockstep.

## Testing
- Background code schema: `server/schemas/langchain-schemas.js:backgroundCodeSchema`
- Coding integration: ensure `sharedState.backgroundCode` is written and `background.js` exists per game
