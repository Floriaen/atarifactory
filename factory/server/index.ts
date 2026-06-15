/**
 * The pipeline service — the factory's public HTTP face. A thin, STATELESS host over
 * `src/api.ts`: it owns provider/model selection and streams a phase's events as NDJSON,
 * but holds no run store, registry, cache, or replay buffer. Same request in → same
 * behaviour out; horizontally scalable. The admin (and any other client) is a pure REST
 * consumer of this surface.
 *
 *   GET  /health           → { ok: true }
 *   GET  /v1/models        → { providers, tiers }
 *   GET  /v1/openapi.json  → the request schema (generated from the Zod contracts)
 *   POST /v1/design        → NDJSON stream, terminal `done` { artifact: GameDefinition, usage }
 *   POST /v1/art           → NDJSON stream, terminal `done` { artifact: SpritePack, usage }
 *   POST /v1/code          → NDJSON stream, terminal `done` { artifact: { report, bundle }, usage }
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod/v4';
import {
  ArtRequest,
  CodeRequest,
  DesignRequest,
} from '@game-factory/contracts';
import {
  OPUS_MODEL,
  SONNET_MODEL,
  createLogger,
  selectProvider,
  type LLMProvider,
  type Logger,
} from '../src/api.js';
import { runPhase, type Emit } from './run.js';

export interface ServiceDeps {
  /** Which backend a request selects (`body.provider`). Injectable so tests pass a MockProvider. */
  providerFor?: (name: string | undefined) => LLMProvider;
  logger?: Logger;
  /** Bearer token required on the billable `/v1/*` routes. When unset, the routes are open (dev). */
  token?: string;
}

const PHASES = {
  design: DesignRequest,
  art: ArtRequest,
  code: CodeRequest,
} as const;

export function createApp(deps: ServiceDeps = {}): Express {
  const providerFor = deps.providerFor ?? ((name) => selectProvider(name));
  const logger = deps.logger ?? createLogger({ level: process.env.LOG_LEVEL ?? 'info' });
  const token = deps.token;

  const app = express();
  app.use(express.json({ limit: '8mb' })); // code requests carry a game + sprite masks

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ── Auth on the billable surface (the pipeline triggers paid LLM calls) ──────
  app.use('/v1', (req: Request, res: Response, next: NextFunction) => {
    if (!token) return next();
    const header = req.header('authorization');
    if (header === `Bearer ${token}`) return next();
    return res.status(401).json({ error: 'unauthorized' });
  });

  app.get('/v1/models', (_req, res) => {
    res.json({
      providers: ['claude', 'claude-code'],
      tiers: [
        { id: 'default', label: 'Default (tuned tiering)' },
        { id: 'opus', label: 'Opus', model: OPUS_MODEL },
        { id: 'sonnet', label: 'Sonnet', model: SONNET_MODEL },
      ],
    });
  });

  app.get('/v1/openapi.json', (_req, res) => {
    res.json(openapiDoc());
  });

  app.post('/v1/design', phaseRoute('design', providerFor, logger));
  app.post('/v1/art', phaseRoute('art', providerFor, logger));
  app.post('/v1/code', phaseRoute('code', providerFor, logger));

  return app;
}

/**
 * One streaming phase route. Validates the body at the edge (`400` before any stream
 * starts), then opens a `200` NDJSON response and runs the phase — a mid-run failure
 * arrives as a terminal `error` event, not an HTTP error. Aborts the run if the client
 * disconnects.
 */
function phaseRoute(
  kind: 'design' | 'art' | 'code',
  providerFor: (name: string | undefined) => LLMProvider,
  logger: Logger,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = PHASES[kind].safeParse(req.body);
    if (!parsed.success) {
      const error = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      res.status(400).json({ error });
      return;
    }
    const body = parsed.data;

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Abort-on-disconnect: listen on the RESPONSE, not the request. On a server
    // `IncomingMessage`, `'close'` can fire as soon as the request message is consumed
    // (not when the client disconnects), which would abort the run mid-flight. `res`
    // `'close'` fires on real disconnect (or on our own `res.end()`); guarding on
    // `writableEnded` distinguishes a genuine drop from normal completion.
    //
    // Set `PIPELINE_NO_ABORT=1` to disable cancellation entirely (the run finishes even if
    // the client goes away) — an escape hatch while diagnosing spurious aborts.
    const ac = new AbortController();
    const abortDisabled = process.env.PIPELINE_NO_ABORT === '1';
    res.on('close', () => {
      if (!abortDisabled && !res.writableEnded) {
        logger.warn({ kind, runId: req.header('x-run-id') }, 'client disconnected mid-run — aborting');
        ac.abort();
      }
    });

    const emit: Emit = (event) => {
      if (!res.writableEnded) res.write(JSON.stringify(event) + '\n');
    };

    const runId = req.header('x-run-id');
    await runPhase(kind, body, {
      provider: providerFor(body.provider),
      logger,
      ...(runId ? { runId } : {}),
      signal: ac.signal,
      emit,
    });
    res.end();
  };
}

/** OpenAPI 3.1 doc generated from the Zod request contracts — the cross-language source of truth. */
function openapiDoc(): unknown {
  const schema = (s: z.ZodType): unknown => {
    try {
      return z.toJSONSchema(s, { unrepresentable: 'any', io: 'input' });
    } catch {
      return { type: 'object' };
    }
  };
  const streamResponse = {
    '200': { description: 'NDJSON event stream, terminated by a `done` or `error` line' },
    '400': { description: 'Invalid request body' },
  };
  const jsonBody = (s: z.ZodType) => ({
    required: true,
    content: { 'application/json': { schema: schema(s) } },
  });
  return {
    openapi: '3.1.0',
    info: { title: 'Game Factory pipeline', version: '1' },
    paths: {
      '/v1/design': { post: { requestBody: jsonBody(DesignRequest), responses: streamResponse } },
      '/v1/art': { post: { requestBody: jsonBody(ArtRequest), responses: streamResponse } },
      '/v1/code': { post: { requestBody: jsonBody(CodeRequest), responses: streamResponse } },
    },
  };
}
