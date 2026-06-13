import { describe, it, expect } from 'vitest';
import { createControlBarTransformerChain } from '../../../agents/chains/coding/ControlBarTransformerAgent.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MockLLM } from '../../helpers/MockLLM.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  function createMockLLM(content) {
    const mock = new MockLLM(content);
    mock.withConfig = function() { return this; };
    mock.withStructuredOutput = function() { return this; };
    return mock;
  }

  async function runWithMock(content, input) {
    const chain = await createControlBarTransformerChain(createMockLLM(content));
    return chain.invoke(input);
  }
  it('converts keyboard/mouse input to control bar events', async () => {
    const transformed = `window.addEventListener('gamepad-press', () => { x += 1; });\nwindow.addEventListener('gamepad-release', () => { x -= 1; });\nx = 0;`;
    const out = await runWithMock(transformed, { gameSource: keyboardGame });
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
    const out = await runWithMock(transformedMinimal, { gameSource: code });
    expect(out).toMatch(/gamepad-press/);
    expect(out).toMatch(/gamepad-release/);
  }, 20000);

  it('leaves unrelated code untouched', async () => {
    const code = 'function foo() { return 7; }';
    const out = await runWithMock(code, { gameSource: code });
    expect(out).toMatch(/function foo/);
    expect(out).not.toMatch(/keydown/);
  });

  it('transforms a real generated game (fixture) to use control bar only', async () => {
    if (process.env.OPENAI_API_KEY) {
      console.warn('Skipping mocked transformation test because OPENAI_API_KEY is set; rely on integration tests instead.');
      return;
    }
    const gamePath = path.join(__dirname, '../../fixtures/generated-game.js');
    const gameSource = fs.readFileSync(gamePath, 'utf8');
    // Simulate LLM output: just replace all keyboard/mouse handlers with gamepad for this test
    // In a real test, the LLM would do the transformation. Here, we just check the pipeline.
    const transformed = gameSource
      .replace(/addEventListener\(['"]keydown['"].*?\);/gs, '// removed')
      .replace(/addEventListener\(['"]keyup['"].*?\);/gs, '// removed')
      .replace(/addEventListener\(['"]mousedown['"].*?\);/gs, '// removed')
      + '\nwindow.addEventListener("gamepad-press", () => {});';
    const out = await runWithMock(transformed, { gameSource });
    // Should not contain any keyboard or mouse event listeners
    expect(out).not.toMatch(/addEventListener\(['"]keydown/);
    expect(out).not.toMatch(/addEventListener\(['"]keyup/);
    expect(out).not.toMatch(/addEventListener\(['"]mousedown/);
    // Should contain at least one control bar/gamepad event
    expect(out).toMatch(/gamepad-press/);
  }, 20000);

  // Manual real-LLM test intentionally removed from automated suite.
});
