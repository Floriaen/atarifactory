import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { updateGameMetaWithThumbnail, captureGameThumbnail } from '../../utils/thumbnailCapture.js';

const GAMES_DIR = path.join(__dirname, '../../games');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

describe('thumbnailCapture utilities', () => {
  const testGameId = 'unit-test-game';
  const testGameDir = path.join(GAMES_DIR, testGameId);

  beforeAll(() => {
    ensureDir(GAMES_DIR);
    ensureDir(testGameDir);
  });

  afterAll(() => {
    // Cleanup test game dir
    try {
      if (fs.existsSync(testGameDir)) {
        // Remove files first
        for (const f of fs.readdirSync(testGameDir)) {
          fs.unlinkSync(path.join(testGameDir, f));
        }
        fs.rmdirSync(testGameDir);
      }
    } catch {
      // ignore
    }
  });

  it('updateGameMetaWithThumbnail adds thumbnail to meta.json when thumb.png exists', async () => {
    const meta = {
      id: testGameId,
      name: 'Unit Test Game',
      description: 'Desc',
      date: new Date().toISOString(),
      model: 'test',
      durationMs: 0,
      tokens: { total: 0, prompt: 0, completion: 0 },
      cost: { usd: 0, byModel: {} }
    };
    fs.writeFileSync(path.join(testGameDir, 'meta.json'), JSON.stringify(meta, null, 2));
    // create dummy thumb file
    fs.writeFileSync(path.join(testGameDir, 'thumb.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47]));

    const ok = await updateGameMetaWithThumbnail(testGameId, testGameDir);
    expect(ok).toBe(true);

    const updated = JSON.parse(fs.readFileSync(path.join(testGameDir, 'meta.json'), 'utf-8'));
    expect(updated.thumbnail).toBe(`/games/${testGameId}/thumb.png`);
  });

  it('captureGameThumbnail returns false when index.html is missing', async () => {
    // Create a fresh folder without index.html
    const badId = 'unit-test-missing';
    const badDir = path.join(GAMES_DIR, badId);
    ensureDir(badDir);

    const ok = await captureGameThumbnail(badId, badDir, { timeout: 1000 });
    expect(ok).toBe(false);

    // cleanup
    try {
      for (const f of fs.readdirSync(badDir)) {
        fs.unlinkSync(path.join(badDir, f));
      }
      fs.rmdirSync(badDir);
    } catch {
      // ignore
    }
  });
});
