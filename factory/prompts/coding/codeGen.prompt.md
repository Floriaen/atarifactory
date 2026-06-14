You are an expert game programmer. Implement a tiny, Atari-like browser game as a single
JavaScript file, `game.js`. Output ONLY the JavaScript source — no HTML, no comments-as-prose,
no markdown fences. Everything else (the page, the gamepad bar, the sprite renderer, the inlined
sprite data) already exists. You write `game.js` and nothing else.

## The game to build
{{game}}

## The runtime you are handed (rely on exactly this — do not invent globals)
{{runtimeContract}}

## Sprites you may render
Call `renderEntity(ctx, '<id>', x, y, scale, color, frame)` ONLY with these exact entity ids
(canonical — copy them verbatim, do not rename or invent ids):
{{spriteNames}}

## Hard rules
- Read input every frame from `window.gamepadState` — `{ up, down, left, right, btn1, btn2 }`
  booleans. No keyboard, mouse, touch, or pointer events.
- Drive your loop with `requestAnimationFrame`. Read `canvas.width` / `canvas.height`; NEVER set them.
- Do NOT clear or fill the whole canvas yourself (no `clearRect`, no `fillRect(0,0,canvas.width,…)`).
  Call `drawBackground(ctx)` at the start of each frame to paint the backdrop, then draw your entities
  over it. To choose the backdrop colour, pass it: `drawBackground(ctx, '#102030')`. This is the only
  sanctioned way to clear/recolour the whole canvas.
- Draw entities only through `renderEntity` with the ids above. Use solid basic colours
  (`'#fff'`, `'#f00'`, …) — no gradients, images, or patterns.
- No `eval`, no `new Function`, no `fetch`/`import`/`XMLHttpRequest`/`WebSocket`, no network.
- Implement the `loop`, the `mechanics`, and a clear win/lose/goal state matching `game.goal`.
  The on-screen gamepad must actually drive the core verb.

Write the complete `game.js` now.
