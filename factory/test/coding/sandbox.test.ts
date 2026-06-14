import { describe, it, expect } from 'vitest';
import { assembleGameBundle } from '../../src/coding/assembleGameBundle.js';
import { runSandbox } from '../../src/coding/sandbox.js';
import { validGame, validSpritePack } from '../helpers/fixtures.js';
import { chromiumAvailable } from './chromium.js';

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

// Input pressing btn1 spawns a moving 'block', so the input pass both draws MORE and moves things.
const INTERACTIVE_JS = `const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const player = { x: 100, y: 100 };
const shots = [];
function loop() {
  const gp = window.gamepadState;
  if (gp.right) player.x += 5;
  if (gp.left) player.x -= 5;
  if (gp.btn1) shots.push({ x: player.x, y: player.y });
  for (const s of shots) s.y -= 4;
  drawBackground(ctx);
  renderEntity(ctx, 'player', player.x, player.y, 2, '#ffffff', 0);
  for (const s of shots) renderEntity(ctx, 'block', s.x, s.y, 2, '#ff0000', 0);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;

const DEAD_JS = `const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
function loop() {
  drawBackground(ctx);
  renderEntity(ctx, 'player', 50, 50, 2, '#ffffff', 0);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;

const THROWING_JS = `throw new Error('boom at load');\n`;

browser('runSandbox (real Chromium)', () => {
  it('an interactive game responds to input: inputDraws differ and an entity moves', async () => {
    const bundle = await assembleGameBundle(validGame, validSpritePack, INTERACTIVE_JS);
    const r = await runSandbox(bundle, { frames: 16 });

    expect(r.ok).toBe(true);
    expect(r.idleDraws).toBeGreaterThan(0);
    expect(r.inputDraws).not.toBe(r.idleDraws);
    expect(r.interacted).toBe(true);
    expect(r.movedEntities).toBeGreaterThan(0);
    expect(r.usedEntities).toContain('player');
  }, 30000);

  it('a game that ignores input fails the interaction signal', async () => {
    const bundle = await assembleGameBundle(validGame, validSpritePack, DEAD_JS);
    const r = await runSandbox(bundle, { frames: 16 });

    expect(r.ok).toBe(true);
    expect(r.inputDraws).toBe(r.idleDraws);
    expect(r.interacted).toBe(false);
    expect(r.movedEntities).toBe(0);
  }, 30000);

  it('a game that throws on load reports ok:false with the REAL error (not masked "Script error.")', async () => {
    const bundle = await assembleGameBundle(validGame, validSpritePack, THROWING_JS);
    const r = await runSandbox(bundle, { frames: 8 });

    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    // file:// scripts are cross-origin, so window.onerror masks this to "Script error."; the gate
    // and the repair loop need the real message, which we recover from Playwright's pageerror.
    expect(r.error).not.toBe('Script error.');
    expect(r.error).toContain('boom at load');
  }, 30000);
});
