/**
 * The admin's Cache Manager store: list / read / delete games. A game's phases share ONE
 * directory — `runs/<gameId>/{game.json, art.json, report.json, game/}` — so one game is one
 * entry, not three. Also surfaces `make batch` cache designs (`runs/cache/design-games.json`).
 * Read-only of the factory: imports ONLY `@game-factory/contracts`, never `src/`.
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseGameBundle,
  parseGameDefinition,
  parseSpritePack,
  type CodeReport,
  type GameBundle,
  type GameDefinition,
  type SpritePack,
} from '@game-factory/contracts';
import { runsDir } from './store.js';

export type RunSource = 'disk' | 'cache';

/** One game in the Library. Phase flags say how far it got. */
export interface GameMeta {
  gameId: string;
  source: RunSource;
  title: string;
  hasArt: boolean;
  hasGame: boolean; // a playable build exists
  passed?: boolean; // the gate verdict, if built
  updatedAt?: number;
}

/** A game's combined artifacts for review/play. */
export interface GameArtifacts {
  gameId: string;
  source: RunSource;
  game: GameDefinition;
  pack?: SpritePack;
  report?: CodeReport;
  bundle?: GameBundle;
}

const cacheFile = (): string => join(runsDir(), 'cache', 'design-games.json');
const gamePath = (id: string, ...rest: string[]) => join(runsDir(), id, ...rest);

function readJson<T>(file: string): T | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

interface CacheEntry {
  traceId: string;
  game: unknown;
}

function readCacheEntries(): CacheEntry[] {
  const parsed = readJson<CacheEntry[]>(cacheFile());
  return Array.isArray(parsed) ? parsed : [];
}

/** Every game, newest first. Disk games win over a same-id batch-cache entry. */
export function listRuns(): GameMeta[] {
  const out: GameMeta[] = [];
  const seen = new Set<string>();
  const root = runsDir();

  if (existsSync(root)) {
    for (const id of readdirSync(root)) {
      if (id === 'cache') continue;
      const game = readJson<{ title?: string }>(gamePath(id, 'game.json'));
      if (!game) continue; // a game dir is defined by game.json
      const report = readJson<{ passed?: boolean }>(gamePath(id, 'report.json'));
      const hasGame = existsSync(gamePath(id, 'game', 'index.html'));
      out.push({
        gameId: id,
        source: 'disk',
        title: game.title ?? id,
        hasArt: existsSync(gamePath(id, 'art.json')),
        hasGame,
        ...(report ? { passed: !!report.passed } : {}),
        updatedAt: statSync(gamePath(id)).mtimeMs,
      });
      seen.add(id);
    }
  }

  const cacheCreatedAt = existsSync(cacheFile()) ? statSync(cacheFile()).mtimeMs : undefined;
  for (const entry of readCacheEntries()) {
    if (seen.has(entry.traceId)) continue;
    out.push({
      gameId: entry.traceId,
      source: 'cache',
      title: (entry.game as { title?: string })?.title ?? entry.traceId,
      hasArt: false,
      hasGame: false,
      ...(cacheCreatedAt !== undefined ? { updatedAt: cacheCreatedAt } : {}),
    });
  }

  return out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** Reconstruct a contract-valid GameBundle from the persisted `runs/<gameId>/game/` files. */
function readBundle(gameId: string): GameBundle {
  const gameDir = gamePath(gameId, 'game');
  const files = readdirSync(gameDir)
    .filter((f) => statSync(join(gameDir, f)).isFile())
    .map((f) => ({ path: f, contents: readFileSync(join(gameDir, f), 'utf8') }));
  return parseGameBundle({
    schemaVersion: 'gamebundle/v1',
    generatedAt: new Date(statSync(gameDir).mtimeMs).toISOString(),
    gameId,
    entry: 'index.html',
    files,
  });
}

/** A game's combined artifacts. Disk first, then the batch cache (design only). */
export function readRun(gameId: string): GameArtifacts | undefined {
  const gameJson = readJson<unknown>(gamePath(gameId, 'game.json'));
  if (gameJson !== undefined) {
    const game = parseGameDefinition(gameJson);
    const packJson = readJson<unknown>(gamePath(gameId, 'art.json'));
    const reportJson = readJson<CodeReport>(gamePath(gameId, 'report.json'));
    const built = existsSync(gamePath(gameId, 'game', 'index.html'));
    return {
      gameId,
      source: 'disk',
      game,
      ...(packJson !== undefined ? { pack: parseSpritePack(packJson) } : {}),
      ...(reportJson ? { report: reportJson } : {}),
      ...(built ? { bundle: readBundle(gameId) } : {}),
    };
  }

  const entry = readCacheEntries().find((e) => e.traceId === gameId);
  if (entry) return { gameId, source: 'cache', game: parseGameDefinition(entry.game) };
  return undefined;
}

/** Game ids are minted `run_*` (or batch-cache slugs) — letters/digits/underscore only, no separators. */
const SAFE_ID = /^[A-Za-z0-9_]+$/;

/** Delete a game: its `runs/<gameId>/` dir (all phases at once), or its entry in the batch cache. */
export function deleteRun(gameId: string): boolean {
  if (!SAFE_ID.test(gameId)) return false; // reject path traversal

  const dir = gamePath(gameId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    return true;
  }

  const entries = readCacheEntries();
  const idx = entries.findIndex((e) => e.traceId === gameId);
  if (idx >= 0) {
    entries.splice(idx, 1);
    writeFileSync(cacheFile(), JSON.stringify(entries, null, 2));
    return true;
  }
  return false;
}
