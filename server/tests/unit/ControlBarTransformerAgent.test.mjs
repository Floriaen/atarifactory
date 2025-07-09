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

  it('transforms a real generated game (fixture) to use control bar only', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const gamePath = path.join(path.dirname(new URL(import.meta.url).pathname), '../fixtures/generated-game.js');
    const gameSource = fs.readFileSync(gamePath, 'utf8');
    // Simulate LLM output: just replace all keyboard/mouse handlers with gamepad for this test
    // In a real test, the LLM would do the transformation. Here, we just check the pipeline.
    const mockLLM = {
      invoke: async (prompt) => ({
        content: gameSource
          .replace(/addEventListener\(['"]keydown['"].*?\);/gs, '// removed')
          .replace(/addEventListener\(['"]keyup['"].*?\);/gs, '// removed')
          .replace(/addEventListener\(['"]mousedown['"].*?\);/gs, '// removed')
          + '\nwindow.addEventListener("gamepad-press", () => {});'
      })
    };
    const sharedState = { gameSource };
    const out = await transformGameCodeWithLLM(sharedState, mockLLM);
    // Should not contain any keyboard or mouse event listeners
    expect(out).not.toMatch(/addEventListener\(['"]keydown/);
    expect(out).not.toMatch(/addEventListener\(['"]keyup/);
    expect(out).not.toMatch(/addEventListener\(['"]mousedown/);
    // Should contain at least one control bar/gamepad event
    expect(out).toMatch(/gamepad-press/);
  }, 20000);

  // Optional: Real LLM integration test (skipped if no key)
  it('real LLM transforms real generated game (manual run)', async () => {
    // Only run this manually with a real LLM and API key
    const { ChatOpenAI } = await import('@langchain/openai');
    const llm = new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, modelName: process.env.OPENAI_MODEL });
    const fs = await import('fs');
    const path = await import('path');
    const gamePath = path.join(path.dirname(new URL(import.meta.url).pathname), '../fixtures/generated-game.js');
    const gameSource = fs.readFileSync(gamePath, 'utf8');
    const sharedState = { gameSource };
    const out = await transformGameCodeWithLLM(sharedState, llm);
    // Log the transformed source for inspection
    console.log('\n--- TRANSFORMED SOURCE ---\n' + out + '\n--- END TRANSFORMED SOURCE ---\n');
    // Ensure all major game logic is preserved (not wiped out)
    const mustPreserve = [
      'const player',
      'const platform',
      'let lightParticles',
      'const lightParticleColors',
      'let hasWon',
      'let gameOver',
      'function spawnLightParticle',
      'function drawPlayer',
      'function drawPlatform',
      'function drawLightParticle',
      'function updatePlayer',
      'function updatePlatform',
      'function updateLightParticles',
      'function tryAbsorbLightParticle',
      'function checkWinCondition',
      'function gameLoop',
      'ctx.fillRect',
      'requestAnimationFrame',
    ];
    for (const snippet of mustPreserve) {
      expect(out).toMatch(new RegExp(snippet));
    }
    // Should not contain any keyboard or mouse event listeners
    expect(out).not.toMatch(/addEventListener\(['"]keydown/);
    expect(out).not.toMatch(/addEventListener\(['"]keyup/);
    expect(out).not.toMatch(/addEventListener\(['"]mousedown/);
    // Should contain at least one control bar/gamepad event
    expect(out).toMatch(/gamepad-press/);
  }, 90000);
});
