/**
 * The admin's Cache Manager store: list / read / delete the persisted runs the admin owns,
 * across two sources — the on-disk runs under `runs/<id>/` (design, art, code) and the batch
 * design cache (`runs/cache/design-games.json`). Read-only of the factory: imports ONLY
 * `@game-factory/contracts` (parse guards + types), never `src/`.
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

export type RunKind = 'design' | 'art' | 'code';
export type RunSource = 'disk' | 'cache';

export interface CachedRunMeta {
  traceId: string;
  source: RunSource;
  kind: RunKind;
  title: string;
  /** Code runs only: did the gate pass? */
  passed?: boolean;
  /** Epoch ms, for newest-first ordering. */
  createdAt?: number;
}

export interface RunArtifacts {
  traceId: string;
  source: RunSource;
  kind: RunKind;
  game: GameDefinition;
  pack?: SpritePack;
  report?: CodeReport;
  bundle?: GameBundle;
}

const cacheFile = (): string => join(runsDir(), 'cache', 'design-games.json');

/** A persisted trace's keys tell its kind: `gameId` ⇒ code, `pack` ⇒ art, else design. */
function classify(trace: { gameId?: unknown; pack?: unknown }): RunKind {
  if (trace.gameId) return 'code';
  if (trace.pack) return 'art';
  return 'design';
}

interface Trace {
  game?: { title?: string };
  pack?: unknown;
  gameId?: string;
  entry?: string;
  report?: { passed?: boolean };
  source?: { title?: string };
}

function readTrace(traceId: string): { trace: Trace; file: string } | undefined {
  const file = join(runsDir(), traceId, 'trace.json');
  if (!existsSync(file)) return undefined;
  try {
    return { trace: JSON.parse(readFileSync(file, 'utf8')) as Trace, file };
  } catch {
    return undefined;
  }
}

interface CacheEntry {
  traceId: string;
  game: unknown;
}

function readCacheEntries(): CacheEntry[] {
  const file = cacheFile();
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as CacheEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Every persisted run, newest first. Disk runs win over a same-id batch-cache entry. */
export function listRuns(): CachedRunMeta[] {
  const out: CachedRunMeta[] = [];
  const seen = new Set<string>();
  const root = runsDir();

  if (existsSync(root)) {
    for (const id of readdirSync(root)) {
      if (id === 'cache') continue;
      const read = readTrace(id);
      if (!read) continue;
      const { trace, file } = read;
      const kind = classify(trace);
      out.push({
        traceId: id,
        source: 'disk',
        kind,
        title: trace.game?.title ?? trace.source?.title ?? id,
        createdAt: statSync(file).mtimeMs,
        ...(kind === 'code' ? { passed: !!trace.report?.passed } : {}),
      });
      seen.add(id);
    }
  }

  const cacheCreatedAt = existsSync(cacheFile()) ? statSync(cacheFile()).mtimeMs : undefined;
  for (const entry of readCacheEntries()) {
    if (seen.has(entry.traceId)) continue;
    out.push({
      traceId: entry.traceId,
      source: 'cache',
      kind: 'design',
      title: (entry.game as { title?: string })?.title ?? entry.traceId,
      ...(cacheCreatedAt !== undefined ? { createdAt: cacheCreatedAt } : {}),
    });
  }

  return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/** Reconstruct a contract-valid GameBundle from the persisted `runs/<id>/game/` files. */
function readBundle(traceId: string, trace: Trace, file: string): GameBundle {
  const gameDir = join(runsDir(), traceId, 'game');
  const files = existsSync(gameDir)
    ? readdirSync(gameDir)
        .filter((f) => statSync(join(gameDir, f)).isFile())
        .map((f) => ({ path: f, contents: readFileSync(join(gameDir, f), 'utf8') }))
    : [];
  return parseGameBundle({
    schemaVersion: 'gamebundle/v1',
    generatedAt: new Date(statSync(file).mtimeMs).toISOString(),
    gameId: trace.gameId,
    entry: trace.entry ?? 'index.html',
    files,
  });
}

/** A run's artifacts for review/play. Disk first (design/art/code), then the batch cache (design). */
export function readRun(traceId: string): RunArtifacts | undefined {
  const read = readTrace(traceId);
  if (read) {
    const { trace, file } = read;
    const kind = classify(trace);
    const game = parseGameDefinition(trace.game);
    if (kind === 'art') return { traceId, source: 'disk', kind, game, pack: parseSpritePack(trace.pack) };
    if (kind === 'code') {
      return { traceId, source: 'disk', kind, game, report: trace.report as CodeReport, bundle: readBundle(traceId, trace, file) };
    }
    return { traceId, source: 'disk', kind: 'design', game };
  }

  const entry = readCacheEntries().find((e) => e.traceId === traceId);
  if (entry) return { traceId, source: 'cache', kind: 'design', game: parseGameDefinition(entry.game) };
  return undefined;
}

/** Run ids are minted `run_*` (or batch-cache slugs) — letters/digits/underscore only, no separators. */
const SAFE_ID = /^[A-Za-z0-9_]+$/;

/** Delete a run: a disk run's `runs/<id>/` dir, or its entry in the batch cache. */
export function deleteRun(traceId: string): boolean {
  if (!SAFE_ID.test(traceId)) return false; // reject path traversal

  const dir = join(runsDir(), traceId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    return true;
  }

  const entries = readCacheEntries();
  const idx = entries.findIndex((e) => e.traceId === traceId);
  if (idx >= 0) {
    entries.splice(idx, 1);
    writeFileSync(cacheFile(), JSON.stringify(entries, null, 2));
    return true;
  }
  return false;
}
