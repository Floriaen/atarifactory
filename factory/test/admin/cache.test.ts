import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseGameBundle } from '../../src/api.js';
import { listRuns, readRun, deleteRun } from '../../admin/server/cache.js';
import { validGame, validSpritePack } from '../helpers/fixtures.js';

/**
 * A game's phases now share ONE directory: runs/<gameId>/{game.json, art.json, report.json, game/}.
 * Drive the cache manager against a temp RUNS_DIR so it never touches the real runs/.
 */
let dir: string;
const prev = process.env.RUNS_DIR;

function seedGame(id: string, parts: { art?: boolean; code?: boolean }): void {
  const gameDir = join(dir, id);
  mkdirSync(gameDir, { recursive: true });
  writeFileSync(join(gameDir, 'game.json'), JSON.stringify(validGame));
  if (parts.art) writeFileSync(join(gameDir, 'art.json'), JSON.stringify(validSpritePack));
  if (parts.code) {
    writeFileSync(join(gameDir, 'report.json'), JSON.stringify({ passed: true, checks: {}, issues: [] }));
    const bundleDir = join(gameDir, 'game');
    mkdirSync(bundleDir, { recursive: true });
    writeFileSync(join(bundleDir, 'index.html'), '<!doctype html><script src="game.js"></script>');
    writeFileSync(join(bundleDir, 'game.js'), 'window.gamepadState; renderEntity(0,"player");');
    writeFileSync(join(bundleDir, 'sprites.data.js'), 'window.spritePack = {};');
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gf-runs-'));
  process.env.RUNS_DIR = dir;

  seedGame('game_d', {}); // design only
  seedGame('game_a', { art: true }); // design + art
  seedGame('game_c', { art: true, code: true }); // full: design + art + built game

  mkdirSync(join(dir, 'cache'), { recursive: true });
  writeFileSync(join(dir, 'cache', 'design-games.json'), JSON.stringify([{ traceId: 'cache_1', game: validGame }]));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (prev === undefined) delete process.env.RUNS_DIR;
  else process.env.RUNS_DIR = prev;
});

describe('admin cache manager (one directory per game)', () => {
  it('listRuns reports one entry per game with phase-progression flags + batch-cache designs', () => {
    const games = listRuns();
    const byId = Object.fromEntries(games.map((g) => [g.gameId, g]));

    expect(byId['game_d']).toMatchObject({ source: 'disk', hasArt: false, hasGame: false, title: validGame.title });
    expect(byId['game_a']).toMatchObject({ source: 'disk', hasArt: true, hasGame: false });
    expect(byId['game_c']).toMatchObject({ source: 'disk', hasArt: true, hasGame: true, passed: true });
    expect(byId['cache_1']).toMatchObject({ source: 'cache', hasArt: false, hasGame: false });
    expect(games).toHaveLength(4);
  });

  it('readRun returns the combined artifacts; a built game yields a contract-valid bundle', () => {
    const full = readRun('game_c');
    expect(full).toMatchObject({ source: 'disk' });
    expect(full?.pack).toBeTruthy();
    expect((full as { report: { passed: boolean } }).report.passed).toBe(true);
    expect(() => parseGameBundle((full as { bundle: unknown }).bundle)).not.toThrow();

    const art = readRun('game_a');
    expect(art?.pack).toBeTruthy();
    expect(art?.bundle).toBeUndefined();

    expect(readRun('cache_1')).toMatchObject({ source: 'cache' });
    expect(readRun('cache_1')?.game.title).toBe(validGame.title);
    expect(readRun('nope')).toBeUndefined();
  });

  it('deleteRun removes the whole game dir and cache entries; rejects traversal/unknowns', () => {
    expect(deleteRun('game_c')).toBe(true);
    expect(existsSync(join(dir, 'game_c'))).toBe(false);
    expect(listRuns().some((g) => g.gameId === 'game_c')).toBe(false);

    expect(deleteRun('cache_1')).toBe(true);
    expect(listRuns().some((g) => g.gameId === 'cache_1')).toBe(false);

    expect(deleteRun('nope')).toBe(false);
    expect(deleteRun('../evil')).toBe(false);
  });
});
