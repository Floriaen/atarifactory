// Admin server: triggers the factory phases and streams their events over SSE.
//   make admin   (runs this + the Vite dev server)
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';

if (existsSync('.env')) process.loadEnvFile('.env');

import {
  OPUS_MODEL,
  SONNET_MODEL,
  createLogger,
  parseGameDefinition,
  selectProvider,
  type GameDefinition,
} from '../../src/api.js';
import { getBus } from './bus.js';
import {
  getDesignGame,
  getResult,
  listDesigns,
  startArt,
  startDesign,
  tierToOverride,
  type ModelTier,
} from './runs.js';

const PORT = Number(process.env.ADMIN_PORT ?? 8787);
const CACHE_FILE = 'runs/cache/design-games.json';
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();
app.use(express.json());

interface RunBody {
  provider?: string;
  modelTier?: ModelTier;
}

const resolveProvider = (name: string | undefined) => selectProvider(name);

app.get('/api/models', (_req, res) => {
  res.json({
    providers: ['claude', 'claude-code'],
    tiers: [
      { id: 'default', label: 'Default (tuned tiering)' },
      { id: 'opus', label: 'Opus', model: OPUS_MODEL },
      { id: 'sonnet', label: 'Sonnet', model: SONNET_MODEL },
    ],
  });
});

app.get('/api/designs', (_req, res) => {
  const session = listDesigns().map((d) => ({ kind: 'run' as const, traceId: d.traceId, title: d.title }));
  const cache = readCacheDesigns().map((d) => ({ kind: 'cache' as const, traceId: d.traceId, title: d.title }));
  res.json([...session, ...cache]);
});

app.post('/api/run/design', (req: Request, res: Response) => {
  const body = req.body as RunBody & { numSeeds?: number };
  const { traceId } = startDesign({
    provider: resolveProvider(body.provider),
    modelOverride: tierToOverride(body.modelTier),
    logger,
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

  const { traceId } = startArt({
    provider: resolveProvider(body.provider),
    modelOverride: tierToOverride(body.modelTier),
    logger,
    now: Date.now(),
    game,
  });
  return res.json({ traceId });
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

  const unsubscribe = bus.subscribe((e) => {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
    if (e.type === 'done' || e.type === 'error') res.end();
  });
  req.on('close', unsubscribe);
  return undefined;
});

app.get('/api/result/:traceId', (req: Request, res: Response) => {
  const result = req.params.traceId ? getResult(req.params.traceId) : undefined;
  if (!result) return res.status(404).json({ error: 'not found' });
  return res.json(result);
});

// Serve the built web app in production (dev uses the Vite server + proxy).
const DIST = path.resolve('admin/web/dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, '127.0.0.1', () => {
  logger.info({ port: PORT }, 'admin server listening');
  console.log(`[admin] API on http://127.0.0.1:${PORT}`);
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
