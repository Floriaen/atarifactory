// Admin server (BFF): the web's single backend. It owns the cache, session registries,
// on-disk source resolution, persistence, and the SSE replay bus — and delegates every
// billable phase to the pipeline service over HTTP. It imports the factory ONLY through
// `@game-factory/contracts` (the wire shapes); it never links the factory in-process.
//   make admin   (runs the pipeline service + this + the Vite dev server)
import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');

import type { GameDefinition, SpritePack } from '@game-factory/contracts';
import { getBus } from './bus.js';
import { deleteRun, listRuns, readRun } from './cache.js';
import { getResult, startArt, startCode, startDesign, type ModelTier } from './runs.js';

const PORT = Number(process.env.ADMIN_PORT ?? 8787);
const PIPELINE_URL = (process.env.PIPELINE_URL ?? 'http://127.0.0.1:8910').replace(/\/$/, '');
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

// Every game carries a design — offer them all as a design source (disk games + batch-cache designs).
app.get('/api/designs', (_req, res) => {
  res.json(
    listRuns().map((g) => ({ kind: g.source === 'cache' ? ('cache' as const) : ('run' as const), traceId: g.gameId, title: g.title })),
  );
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

// Art runs off a game's design; it persists into that SAME game dir (source.traceId is the gameId).
app.post('/api/run/art', (req: Request, res: Response) => {
  const body = req.body as RunBody & { source?: { kind?: string; traceId?: string } };
  const gameId = body.source?.traceId;
  if (!gameId) return res.status(400).json({ error: 'source.traceId is required' });

  let game: GameDefinition | undefined;
  try {
    game = readRun(gameId)?.game;
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (!game) return res.status(404).json({ error: `no design found for ${gameId}` });

  const { traceId } = startArt({ provider: body.provider, modelTier: body.modelTier, now: Date.now(), game, gameId });
  return res.json({ traceId });
});

// Selectable code inputs: games that already have art (sprites ready).
app.get('/api/arts', (_req, res) => {
  res.json(listRuns().filter((g) => g.hasArt).map((g) => ({ kind: 'run' as const, traceId: g.gameId, title: g.title })));
});

app.post('/api/run/code', (req: Request, res: Response) => {
  const body = req.body as RunBody & { source?: { kind?: string; traceId?: string } };
  const gameId = body.source?.traceId;
  if (!gameId) return res.status(400).json({ error: 'source.traceId is required' });

  // Code runs off a game: its art if present (sprites ready), else its design (art runs inline first).
  let input: { game: GameDefinition; pack?: SpritePack } | undefined;
  try {
    const run = readRun(gameId);
    input = run ? { game: run.game, ...(run.pack ? { pack: run.pack } : {}) } : undefined;
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
  if (!input) return res.status(404).json({ error: `no design or art source found for ${gameId}` });

  const run = startCode({
    provider: body.provider,
    modelTier: body.modelTier,
    now: Date.now(),
    game: input.game,
    ...(input.pack ? { pack: input.pack } : {}),
    gameId,
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
