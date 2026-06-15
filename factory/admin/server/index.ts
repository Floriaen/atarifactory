// Admin server (BFF): the web's single backend. It owns the cache, session registries,
// on-disk source resolution, persistence, and the SSE replay bus — and delegates every
// billable phase to the pipeline service over HTTP. It imports the factory ONLY through
// `@game-factory/contracts` (the wire shapes); it never links the factory in-process.
//   make admin   (runs the pipeline service + this + the Vite dev server)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');

import {
  parseGameDefinition,
  parseSpritePack,
  type GameDefinition,
  type SpritePack,
} from '@game-factory/contracts';
import { getBus } from './bus.js';
import { deleteRun, listRuns, readRun } from './cache.js';
import {
  getArt,
  getDesignGame,
  getResult,
  listArts,
  listDesigns,
  startArt,
  startCode,
  startDesign,
  type ModelTier,
} from './runs.js';

const PORT = Number(process.env.ADMIN_PORT ?? 8787);
const PIPELINE_URL = (process.env.PIPELINE_URL ?? 'http://127.0.0.1:8910').replace(/\/$/, '');
const CACHE_FILE = 'runs/cache/design-games.json';
const log = (msg: string, extra?: unknown) => console.log(`[admin] ${msg}`, extra ?? '');

const app = express();
app.use(express.json());

interface RunBody {
  provider?: string;
  modelTier?: ModelTier;
}

// Surface pipeline reachability so the UI can show "pipeline up/down" instead of failing a run cold.
app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${PIPELINE_URL}/health`);
    return res.json({ pipeline: r.ok });
  } catch {
    return res.json({ pipeline: false });
  }
});

// Model metadata lives on the pipeline (it owns provider/model selection); the admin proxies it.
app.get('/api/models', async (_req, res) => {
  try {
    const r = await fetch(`${PIPELINE_URL}/v1/models`);
    return res.status(r.status).json(await r.json());
  } catch (err) {
    return res.status(502).json({ error: `pipeline unreachable: ${err instanceof Error ? err.message : String(err)}` });
  }
});

app.get('/api/designs', (_req, res) => {
  const session = listDesigns().map((d) => ({ kind: 'run' as const, traceId: d.traceId, title: d.title }));
  const cache = readCacheDesigns().map((d) => ({ kind: 'cache' as const, traceId: d.traceId, title: d.title }));
  res.json([...session, ...cache]);
});

app.post('/api/run/design', (req: Request, res: Response) => {
  const body = req.body as RunBody & { numSeeds?: number };
  const { traceId } = startDesign({
    provider: body.provider,
    modelTier: body.modelTier,
    now: Date.now(),
    ...(body.numSeeds ? { numSeeds: body.numSeeds } : {}),
  });
  res.json({ traceId });
});

app.post('/api/run/art', (req: Request, res: Response) => {
  const body = req.body as RunBody & { source?: { kind: 'run' | 'cache'; traceId: string } };
  const source = body.source;
  if (!source?.traceId) return res.status(400).json({ error: 'source.traceId is required' });

  let game: GameDefinition | undefined;
  try {
    game = source.kind === 'cache' ? readCacheGame(source.traceId) : getDesignGame(source.traceId);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (!game) return res.status(404).json({ error: `no design found for ${source.kind} ${source.traceId}` });

  const { traceId } = startArt({ provider: body.provider, modelTier: body.modelTier, now: Date.now(), game });
  return res.json({ traceId });
});

// Selectable code inputs: this session's art runs + persisted art traces on disk (design→art→code).
app.get('/api/arts', (_req, res) => {
  const session = listArts().map((a) => ({ kind: 'run' as const, traceId: a.traceId, title: a.title }));
  const sessionIds = new Set(session.map((s) => s.traceId));
  const disk = readArtTraces()
    .filter((a) => !sessionIds.has(a.traceId))
    .map((a) => ({ kind: 'trace' as const, traceId: a.traceId, title: a.title }));
  res.json([...session, ...disk]);
});

// Code runs off an art result (sprites ready) OR a design (sprites generated inline first).
// Resolve by traceId across session + disk so it's robust to the source's `kind` hint being stale
// (e.g. a session art run that vanished on restart and now lives on disk as a trace).
function resolveCodeInput(traceId: string): { game: GameDefinition; pack?: SpritePack } | undefined {
  const art = getArt(traceId) ?? readArtTrace(traceId); // {game, pack} — sprites ready
  if (art) return art;
  const game = getDesignGame(traceId) ?? readCacheGame(traceId) ?? readTraceGame(traceId); // design → art runs inline
  return game ? { game } : undefined;
}

app.post('/api/run/code', (req: Request, res: Response) => {
  const body = req.body as RunBody & { source?: { kind?: string; traceId?: string } };
  const traceId = body.source?.traceId;
  if (!traceId) return res.status(400).json({ error: 'source.traceId is required' });

  let input: { game: GameDefinition; pack?: SpritePack } | undefined;
  try {
    input = resolveCodeInput(traceId);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (!input) return res.status(404).json({ error: `no design or art source found for ${traceId}` });

  const run = startCode({
    provider: body.provider,
    modelTier: body.modelTier,
    now: Date.now(),
    game: input.game,
    ...(input.pack ? { pack: input.pack } : {}),
  });
  return res.json({ traceId: run.traceId });
});

app.get('/api/stream/:traceId', (req: Request, res: Response) => {
  const { traceId } = req.params;
  const bus = traceId ? getBus(traceId) : undefined;
  if (!bus) return res.status(404).end();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 2000\n\n');

  let off = () => {};
  off = bus.subscribe((e) => {
    // Guard the write: if the browser already went away, throwing here would crash the bus
    // emit's caller (the pipeline reader) and abort the run. Unsubscribe instead.
    if (res.writableEnded) {
      off();
      return;
    }
    res.write(`data: ${JSON.stringify(e)}\n\n`);
    if (e.type === 'done' || e.type === 'error') res.end();
  });
  // `res` 'close' fires on a real client disconnect (more reliable than `req` 'close' here).
  res.on('close', () => off());
  req.on('close', () => off());
  return undefined;
});

app.get('/api/result/:traceId', (req: Request, res: Response) => {
  const result = req.params.traceId ? getResult(req.params.traceId) : undefined;
  if (!result) return res.status(404).json({ error: 'not found' });
  return res.json(result);
});

// ── Cache Manager: browse / review / play / delete persisted runs (disk + batch cache) ──
app.get('/api/runs', (_req, res) => {
  res.json(listRuns());
});

app.get('/api/runs/:traceId', (req: Request, res: Response) => {
  let run;
  try {
    run = req.params.traceId ? readRun(req.params.traceId) : undefined;
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (!run) return res.status(404).json({ error: 'not found' });
  return res.json(run);
});

app.delete('/api/runs/:traceId', (req: Request, res: Response) => {
  const ok = req.params.traceId ? deleteRun(req.params.traceId) : false;
  if (!ok) return res.status(404).json({ error: 'not found' });
  return res.json({ ok: true });
});

// Serve the built web app in production (dev uses the Vite server + proxy).
const DIST = path.resolve('admin/web/dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, '127.0.0.1', () => {
  log(`API on http://127.0.0.1:${PORT}  ·  pipeline ${PIPELINE_URL}`);
});

// ── cache helpers ───────────────────────────────────────────────────────────
interface CacheEntry {
  traceId: string;
  game: unknown;
}

function readCache(): CacheEntry[] {
  if (!existsSync(CACHE_FILE)) return [];
  const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as CacheEntry[];
  return Array.isArray(parsed) ? parsed : [];
}

function readCacheDesigns(): Array<{ traceId: string; title: string }> {
  return readCache().map((e) => {
    const title = (e.game as { title?: string })?.title ?? e.traceId;
    return { traceId: e.traceId, title };
  });
}

function readCacheGame(traceId: string): GameDefinition | undefined {
  const entry = readCache().find((e) => e.traceId === traceId);
  return entry ? parseGameDefinition(entry.game) : undefined;
}

// ── persisted art-trace helpers (run code on a previous art result) ──────────
interface ArtTrace {
  game?: { title?: string };
  pack?: unknown;
}

/** Art traces on disk carry both a `game` and a `pack` (written by the admin's `store.ts`). */
function readArtTraces(): Array<{ traceId: string; title: string }> {
  const root = 'runs';
  if (!existsSync(root)) return [];
  const out: Array<{ traceId: string; title: string }> = [];
  for (const id of readdirSync(root)) {
    if (id === 'cache') continue;
    const file = path.join(root, id, 'trace.json');
    if (!existsSync(file)) continue;
    try {
      const trace = JSON.parse(readFileSync(file, 'utf8')) as ArtTrace;
      if (trace.pack && trace.game) out.push({ traceId: id, title: trace.game.title ?? id });
    } catch {
      // skip an unreadable/partial trace
    }
  }
  return out;
}

function readArtTrace(traceId: string): { game: GameDefinition; pack: SpritePack } | undefined {
  const file = path.join('runs', traceId, 'trace.json');
  if (!existsSync(file)) return undefined;
  const trace = JSON.parse(readFileSync(file, 'utf8')) as { game?: unknown; pack?: unknown };
  if (!trace.game || !trace.pack) return undefined;
  return { game: parseGameDefinition(trace.game), pack: parseSpritePack(trace.pack) };
}

/** A design's game from any on-disk trace that carries one (design, art, or code run). */
function readTraceGame(traceId: string): GameDefinition | undefined {
  const file = path.join('runs', traceId, 'trace.json');
  if (!existsSync(file)) return undefined;
  try {
    const trace = JSON.parse(readFileSync(file, 'utf8')) as { game?: unknown };
    return trace.game ? parseGameDefinition(trace.game) : undefined;
  } catch {
    return undefined;
  }
}
