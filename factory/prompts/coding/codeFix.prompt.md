You are repairing a tiny browser game's `game.js`. Fix EXACTLY the listed issues and keep
everything that already works — this is a targeted revision, not a rewrite. Output ONLY the
complete, corrected JavaScript source for `game.js` — no markdown fences, no prose.

## The game this implements
{{game}}

## Issues to fix (each must be resolved)
{{issues}}

## The current game.js (revise this — do not start over)
```
{{priorJs}}
```

Keep the same runtime contract: read `window.gamepadState` each frame; drive the loop with
`requestAnimationFrame`; read `canvas.width`/`canvas.height` but never set them; never clear or fill
the whole canvas yourself (no `clearRect`, no `fillRect(0,0,canvas.width,…)`) — call
`drawBackground(ctx)`, or `drawBackground(ctx, '#102030')` for a coloured backdrop, instead; draw only
through `renderEntity` with the game's canonical entity ids; solid basic colours only; no
`eval`/`fetch`/`import`/network. Output the full corrected `game.js`.
