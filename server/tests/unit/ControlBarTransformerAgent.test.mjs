import { describe, it, expect } from 'vitest';
import { transformGameCodeWithLLM } from '../../../server/agents/chains/ControlBarTransformerAgent.mjs';

// Canonical input: contains keyboard and mouse input
const keyboardGame = `
const canvas = document.getElementById('game-canvas');
let x = 0;
window.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft') x -= 1;
  if (e.key === 'ArrowRight') x += 1;
  if (e.key === ' ') x = 0;
});
canvas.addEventListener('mousedown', function(e) { x += 10; });
`;

describe('ControlBarTransformerAgent', () => {
  it('converts keyboard/mouse input to control bar events', async () => {
    const transformed = `window.addEventListener('gamepad-press', () => { x += 1; });\nwindow.addEventListener('gamepad-release', () => { x -= 1; });\nx = 0;`;
    const mockLLM = { invoke: async () => ({ content: transformed }) };
    const sharedState = { gameSource: keyboardGame };
    const out = await transformGameCodeWithLLM(sharedState, mockLLM);
    expect(out).toMatch(/window\.addEventListener\(['"]gamepad-press['"],/s);
    expect(out).not.toMatch(/addEventListener\(['"]keydown/);
    expect(out).not.toMatch(/addEventListener\(['"]mousedown/);
    expect(out).toMatch(/x[ ]*\+[=][ ]*1/); // right
    expect(out).toMatch(/x[ ]*-[=][ ]*1/); // left
    expect(out).toMatch(/x[ ]*=[ ]*0/); // btn1
  }, 20000);

  it('injects minimal handlers if none present', async () => {
    const code = 'let y = 42;';
    const transformedMinimal = 'gamepad-press\ngamepad-release';
    const minimalMockLLM = { invoke: async () => ({ content: transformedMinimal }) };
    const sharedState = { gameSource: code };
    const out = await transformGameCodeWithLLM(sharedState, minimalMockLLM);
    expect(out).toMatch(/gamepad-press/);
    expect(out).toMatch(/gamepad-release/);
  }, 20000);

  it('leaves unrelated code untouched', async () => {
    const code = 'function foo() { return 7; }';
    const mockLLM = { invoke: async () => ({ content: code }) };
    const sharedState = { gameSource: code };
    const out = await transformGameCodeWithLLM(sharedState, mockLLM);
    expect(out).toMatch(/function foo/);
    expect(out).not.toMatch(/keydown/);
  });
});
