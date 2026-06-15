import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseGameBundle } from '../../src/api.js';
import { listRuns, readRun, deleteRun } from '../../admin/server/cache.js';
import { validGame, validSpritePack } from '../helpers/fixtures.js';

/**
 * The cache manager reads/deletes from disk + the batch cache. Drive it against a temp
 * RUNS_DIR so it never touches the real runs/.
 */
let dir: string;
const prev = process.env.RUNS_DIR;

function writeTrace(id: string, trace: unknown): void {
  mkdirSync(join(dir, id), { recursive: true });
  writeFileSync(join(dir, id, 'trace.json'), JSON.stringify(trace));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gf-runs-'));
  process.env.RUNS_DIR = dir;

  writeTrace('run_d_0', { traceId: 'run_d_0', game: validGame, usage: { costUsd: 0.01 } });
  writeTrace('run_a_0', { traceId: 'run_a_0', source: { title: validGame.title }, game: validGame, pack: validSpritePack, usage: {} });
  writeTrace('run_c_0', {
    traceId: 'run_c_0',
    source: { title: validGame.title },
    game: validGame,
    gameId: 'upstack',
    entry: 'index.html',
    report: { passed: true, checks: {}, issues: [] },
    usage: { totals: { costUsd: 0.02 } },
  });
  const gameDir = join(dir, 'run_c_0', 'game');
  mkdirSync(gameDir, { recursive: true });
  writeFileSync(join(gameDir, 'index.html'), '<!doctype html><script src="game.js"></script>');
  writeFileSync(join(gameDir, 'game.js'), 'window.gamepadState; renderEntity(0,"player");');
  writeFileSync(join(gameDir, 'sprites.data.js'), 'window.spritePack = {};');

  mkdirSync(join(dir, 'cache'), { recursive: true });
  writeFileSync(join(dir, 'cache', 'design-games.json'), JSON.stringify([{ traceId: 'cache_1', game: validGame }]));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  if (prev === undefined) delete process.env.RUNS_DIR;
  else process.env.RUNS_DIR = prev;
});

describe('admin cache manager', () => {
  it('listRuns classifies disk runs by kind and includes batch-cache designs', () => {
    const runs = listRuns();
    const byId = Object.fromEntries(runs.map((r) => [r.traceId, r]));

    expect(byId['run_d_0']).toMatchObject({ kind: 'design', source: 'disk' });
    expect(byId['run_a_0']).toMatchObject({ kind: 'art', source: 'disk' });
    expect(byId['run_c_0']).toMatchObject({ kind: 'code', source: 'disk', passed: true });
    expect(byId['cache_1']).toMatchObject({ kind: 'design', source: 'cache' });
    expect(runs.every((r) => r.title === validGame.title)).toBe(true);
  });

  it('readRun returns a contract-valid bundle + report for a code run', () => {
    const run = readRun('run_c_0');
    expect(run?.kind).toBe('code');
    expect((run as { report: { passed: boolean } }).report.passed).toBe(true);
    expect(() => parseGameBundle((run as { bundle: unknown }).bundle)).not.toThrow();
  });

  it('readRun returns the pack for an art run and the game for a cache design', () => {
    expect(readRun('run_a_0')).toMatchObject({ kind: 'art' });
    expect(readRun('run_a_0')?.pack).toBeTruthy();
    expect(readRun('cache_1')).toMatchObject({ kind: 'design', source: 'cache' });
    expect(readRun('nope')).toBeUndefined();
  });

  it('deleteRun removes a disk run and a cache entry; rejects traversal and unknowns', () => {
    expect(deleteRun('run_c_0')).toBe(true);
    expect(existsSync(join(dir, 'run_c_0'))).toBe(false);
    expect(listRuns().some((r) => r.traceId === 'run_c_0')).toBe(false);

    expect(deleteRun('cache_1')).toBe(true);
    expect(listRuns().some((r) => r.traceId === 'cache_1')).toBe(false);

    expect(deleteRun('nope')).toBe(false);
    expect(deleteRun('../evil')).toBe(false);
  });
});
