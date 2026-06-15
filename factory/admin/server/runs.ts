/**
 * The admin's orchestration layer — now a pure REST client of the pipeline service.
 * It mints the run identity, POSTs one phase to the pipeline, relays the NDJSON stream
 * verbatim into the per-run {@link RunBus}, and on the terminal `done` persists the
 * artifact (admin-owned) and updates the session registries. It imports NO factory
 * `src/` code — only `@game-factory/contracts` for the wire types.
 */
import {
  parseGameDefinition,
  parseSpritePack,
  type GameBundle,
  type GameDefinition,
  type ModelTier,
  type SpritePack,
  type StreamEvent,
} from '@game-factory/contracts';
import { createBus, type RunBus } from './bus.js';
import { persistArt, persistCode, persistDesign } from './store.js';

export type { ModelTier };

// Read per-call (not at module load) so the process can be configured after import.
function pipelineUrl(): string {
  return (process.env.PIPELINE_URL ?? 'http://127.0.0.1:8910').replace(/\/$/, '');
}
function authHeader(): Record<string, string> {
  return process.env.PIPELINE_TOKEN ? { authorization: `Bearer ${process.env.PIPELINE_TOKEN}` } : {};
}

let counter = 0;
/** The admin owns run identity (it owns the registry); the id flows to the pipeline as `x-run-id`. */
function mintRunId(now: number): string {
  return `run_${now.toString(36)}_${(counter++).toString(36)}`;
}

/**
 * Live results of this session's runs, keyed by the run's stream id (what the web subscribed to),
 * so `/api/result/:traceId` can serve the just-finished artifact. Listing + cross-phase chaining
 * are disk-backed per game (see `cache.ts`), not held here.
 */
const results = new Map<string, { kind: 'design' | 'art' | 'code'; artifact: unknown; usage: unknown }>();

export function getResult(traceId: string) {
  return results.get(traceId);
}

interface BaseOpts {
  provider?: string;
  modelTier?: ModelTier;
  now: number;
}

function selectors(opts: BaseOpts): Record<string, unknown> {
  return {
    ...(opts.provider ? { provider: opts.provider } : {}),
    ...(opts.modelTier ? { modelTier: opts.modelTier } : {}),
  };
}

/**
 * POST one phase to the pipeline and relay its NDJSON stream line-by-line to `onEvent`.
 * A non-2xx (e.g. a 400 from body validation, or the pipeline being down) is surfaced as a
 * terminal `error` event — the same shape a mid-run failure takes — so callers handle one path.
 */
async function streamPipeline(
  path: string,
  body: unknown,
  runId: string,
  onEvent: (e: StreamEvent) => void | Promise<void>,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${pipelineUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-run-id': runId, ...authHeader() },
      body: JSON.stringify(body),
    });
  } catch (err) {
    await onEvent({ type: 'error', message: `pipeline unreachable at ${pipelineUrl()}: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let message = `pipeline ${path} returned ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      /* non-JSON body */
    }
    await onEvent({ type: 'error', message });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = async (chunk: string): Promise<void> => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) await onEvent(JSON.parse(line) as StreamEvent);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    await flush(decoder.decode(value, { stream: true }));
  }
  const tail = buffer.trim();
  if (tail) await onEvent(JSON.parse(tail) as StreamEvent);
}

/** Run a phase in the background, persisting + registering on `done`, error-safe throughout. */
function launch(
  runId: string,
  bus: RunBus,
  path: string,
  body: unknown,
  onDone: (event: Extract<StreamEvent, { type: 'done' }>) => Promise<void>,
): void {
  void (async () => {
    try {
      await streamPipeline(path, body, runId, async (event) => {
        if (event.type === 'done') await onDone(event);
        bus.emit(event);
      });
    } catch (err) {
      if (!bus.isClosed) bus.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  })();
}

/**
 * A run has two ids: the ephemeral **stream id** (returned to the web as `traceId`, used as the
 * `RunBus` key + the pipeline `x-run-id`) and the persistent **gameId** (the directory the artifact
 * lands in). Design mints a new game; art/code persist into the design's gameId so a game's phases
 * share one `runs/<gameId>/` directory.
 */
export function startDesign(opts: BaseOpts & { numSeeds?: number }): { traceId: string; bus: RunBus } {
  const traceId = mintRunId(opts.now); // a fresh design IS a new game
  const bus = createBus(traceId, opts.now);
  const body = { ...selectors(opts), ...(opts.numSeeds ? { numSeeds: opts.numSeeds } : {}) };

  launch(traceId, bus, '/v1/design', body, async (event) => {
    const game = parseGameDefinition(event.artifact);
    results.set(traceId, { kind: 'design', artifact: game, usage: event.usage });
    await persistDesign(traceId, game); // gameId = traceId
  });

  return { traceId, bus };
}

export function startArt(opts: BaseOpts & { game: GameDefinition; gameId: string }): { traceId: string; bus: RunBus } {
  const traceId = mintRunId(opts.now);
  const bus = createBus(traceId, opts.now);
  const body = { ...selectors(opts), game: opts.game };

  launch(traceId, bus, '/v1/art', body, async (event) => {
    const pack = parseSpritePack(event.artifact);
    results.set(traceId, { kind: 'art', artifact: pack, usage: event.usage });
    await persistArt(opts.gameId, opts.game, pack); // into the design's game dir
  });

  return { traceId, bus };
}

/**
 * The coding phase (M3): the `pack` may be supplied (chaining off an art result) OR omitted
 * (chaining straight off a design — the pipeline runs the art phase inline first, into the same
 * stream). The `done` artifact is `{ report, bundle }`, persisted into the game's dir so
 * `make play TRACE=<gameId>` works on admin runs too.
 */
export function startCode(opts: BaseOpts & { game: GameDefinition; pack?: SpritePack; gameId: string }): { traceId: string; bus: RunBus } {
  const traceId = mintRunId(opts.now);
  const bus = createBus(traceId, opts.now);
  const body = { ...selectors(opts), game: opts.game, ...(opts.pack ? { pack: opts.pack } : {}) };

  launch(traceId, bus, '/v1/code', body, async (event) => {
    const artifact = event.artifact as { report: unknown; bundle: GameBundle };
    results.set(traceId, { kind: 'code', artifact, usage: event.usage });
    await persistCode(opts.gameId, opts.game, artifact); // into the game's dir
  });

  return { traceId, bus };
}
