// Playwright integration test: ensures all controlBar actions work after transformation
import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { transformGameCodeWithLLM } from '../../agents/chains/ControlBarTransformerAgent.mjs';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

const OPENAI_MODEL = process.env.OPENAI_MODEL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = 3009;

// Minimal static server for game.html + transformed game.js
function serveStatic({ html, js }) {
  return http.createServer((req, res) => {
    if (req.url === '/game.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(js);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }
  });
}

test('Transformed game responds to all controlBar actions only', async ({ page }) => {
  if (!OPENAI_MODEL || !OPENAI_API_KEY) {
    test.skip('No OpenAI model/API key');
    return;
  }
  const llm = new ChatOpenAI({ model: OPENAI_MODEL, apiKey: OPENAI_API_KEY, temperature: 0 });
  const fixturePath = path.resolve('server/tests/fixtures/all-controlbar-game.js');
  const gameSource = await fs.readFile(fixturePath, 'utf8');
  const sharedState = { gameSource };
  const transformed = await transformGameCodeWithLLM(sharedState, llm);

  // Minimal HTML boilerplate
  const html = `<!DOCTYPE html><html><body><canvas id="game-canvas"></canvas><script src="/game.js"></script></body></html>`;
  const server = serveStatic({ html, js: transformed });
  await new Promise(r => server.listen(PORT, r));
  try {
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForSelector('#game-canvas');

    // Helper: get player position and color
    const getPlayer = async () => await page.evaluate(() => ({
      x: window.player?.x,
      y: window.player?.y,
      color: window.player?.color,
      lastAction: window.lastAction
    }));

    // Simulate each controlBar action
    const actions = [
      { key: 'left', dx: -20, dy: 0, color: 'blue' },
      { key: 'right', dx: 20, dy: 0, color: 'blue' },
      { key: 'up', dx: 0, dy: -20, color: 'blue' },
      { key: 'down', dx: 0, dy: 20, color: 'blue' },
      { key: 'btn1', dx: 0, dy: 0, color: 'red' },
      { key: 'btn2', dx: 0, dy: 0, color: 'green' },
    ];

    let prev = await getPlayer();
    for (const action of actions) {
      await page.evaluate(key => {
        window.dispatchEvent(new CustomEvent('gamepad-press', { detail: { key } }));
      }, action.key);
      await page.waitForTimeout(100);
      const curr = await getPlayer();
      if (action.dx || action.dy) {
        expect(curr.x).toBe(prev.x + (action.dx || 0));
        expect(curr.y).toBe(prev.y + (action.dy || 0));
      }
      if (action.color) {
        expect(curr.color).toBe(action.color);
      }
      expect(curr.lastAction).toBe(action.key);
      prev = curr;
    }

    // Keyboard event should NOT affect player
    const before = await getPlayer();
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const after = await getPlayer();
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(after.color).toBe(before.color);
  } finally {
    server.close();
  }
});
