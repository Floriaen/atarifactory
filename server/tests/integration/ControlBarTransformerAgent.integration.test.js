import { describe, it, expect } from 'vitest';
import { transformGameCodeWithLLM } from '../../../server/agents/chains/ControlBarTransformerAgent.js';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';

const GAME_SOURCE_PATH = '../fixtures/generated-game.js';

// Only run if OPENAI_API_KEY is set
const RUN_OPENAI = process.env.RUN_OPENAI_INTEGRATIONS === '1';
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const shouldRun = RUN_OPENAI && hasOpenAIKey;

(shouldRun ? describe : describe.skip)('ControlBarTransformerAgent [integration]', () => {
  it('transforms a real game.js to use only control bar input (LLM)', async () => {
    const gameSource = fs.readFileSync(new URL(GAME_SOURCE_PATH, import.meta.url), 'utf8');
    const llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL, temperature: 0 });
    const out = await transformGameCodeWithLLM({ gameSource }, llm);
    // Must remove all keyboard/mouse input
    expect(out).not.toMatch(/addEventListener\(['"]key/);
    expect(out).not.toMatch(/addEventListener\(['"]mouse/);
    // Must include control bar events
    expect(out).toMatch(/gamepad-press/);
    expect(out).toMatch(/gamepad-release/);
    // Should still contain core game logic
    expect(out).toMatch(/function drawPlayer/);
    expect(out).toMatch(/function updatePlayer/);
    expect(out.length).toBeGreaterThan(1000);
  }, 60000);
});
