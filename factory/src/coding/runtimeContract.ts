/**
 * The runtime contract `game.js` may rely on — the single source of truth, injected
 * into the codeGen prompt as `{{runtimeContract}}`. It describes exactly the globals
 * and helpers the deterministic templates (`src/coding/templates/*`) provide, so the
 * prompt text can never drift from the actual runtime.
 */
export const RUNTIME_CONTRACT = `Globals available before \`game.js\` runs:

- \`canvas\` and \`ctx\` are provided globals — the shell already resolved the canvas and its 2D
  context. Use them directly; do NOT call \`document.getElementById\` or \`getContext\` yourself.
  The shell sizes the canvas; read \`canvas.width\` and \`canvas.height\`, but never assign them.
- \`window.gamepadState\` — a live object \`{ up, down, left, right, btn1, btn2 }\` of booleans,
  kept current from the on-screen gamepad. Poll it each frame. This is the ONLY input.
  The two action buttons are LABELLED **A** (\`btn1\`) and **B** (\`btn2\`) on screen, and the D-pad is
  the arrows ▲▼◀▶. Keep reading \`gamepadState.btn1\`/\`btn2\` in code, but in any text you draw for the
  player (instructions, HUD, prompts) refer to the buttons by their on-screen labels — "A" and "B",
  and the arrows — NEVER the raw ids \`btn1\`/\`btn2\`.
- \`renderEntity(ctx, id, x, y, scale, color, frame)\` — draws an entity's pixel sprite at
  top-left \`(x, y)\`, each sprite pixel a \`scale\`×\`scale\` block in CSS \`color\`. \`frame\` selects
  an animation frame (wraps automatically; use \`0\` if you only need one).
- \`drawBackground(ctx, color?)\` — paints the full-canvas backdrop. Call it first each frame INSTEAD
  of clearing the canvas yourself (an Atari constraint forbids you clearing/filling the whole canvas).
  Pass an optional CSS colour to choose the backdrop, e.g. \`drawBackground(ctx, '#102030')\`; with no
  colour it defaults to near-black. This is the ONLY sanctioned way to clear/recolour the whole canvas.
- \`requestAnimationFrame(cb)\` — drive your game loop with this.`;
