/**
 * The stateless run engine behind the pipeline REST API. One phase per call: build
 * a throwaway {@link Observer} whose sink forwards every {@link FactoryEvent} to the
 * caller's `emit`, run the phase, and mint the terminal `done` (artifact + usage) or
 * `error`. NOTHING is persisted — no `RunStore`, no registry, no disk. The artifact
 * rides out in the `done` event; the admin owns persistence.
 */
import {
  Observer,
  UsageAggregator,
  createRunContext,
  withTrace,
  DEFAULT_MODEL,
  OPUS_MODEL,
  SONNET_MODEL,
  runArtPhase,
  runCodePhase,
  runDesignPhase,
  type LLMProvider,
  type Logger,
  type ModelConfig,
} from '../src/api.js';
import type {
  ArtRequest,
  CodeRequest,
  DesignRequest,
  ModelTier,
  StreamEvent,
} from '@game-factory/contracts';

/** Force a model tier across the phase. `default` (or undefined) keeps the factory's tuned tiering. */
export function tierToOverride(tier: ModelTier | undefined): Partial<ModelConfig> | undefined {
  if (tier === 'opus') return { model: OPUS_MODEL };
  if (tier === 'sonnet') return { model: SONNET_MODEL };
  return undefined;
}

export type Emit = (event: StreamEvent) => void;

export interface RunDeps {
  provider: LLMProvider;
  logger: Logger;
  /** The admin-minted `x-run-id`, adopted as the run's traceId for cross-process log correlation. */
  runId?: string;
  /** Aborted when the HTTP connection drops — cancels the in-flight LLM calls. */
  signal?: AbortSignal;
  emit: Emit;
}

/**
 * Run one phase to completion, streaming events through `deps.emit`. Always resolves
 * (never throws): a mid-run failure is surfaced as a terminal `error` event, since the
 * HTTP response already carries a 200 by the time the phase runs.
 */
export async function runPhase(
  kind: 'design' | 'art' | 'code',
  body: DesignRequest | ArtRequest | CodeRequest,
  deps: RunDeps,
): Promise<void> {
  const ctx = createRunContext({ model: DEFAULT_MODEL, ...(deps.runId ? { traceId: deps.runId } : {}) });
  const usage = new UsageAggregator();
  const observer = new Observer({
    ctx,
    logger: withTrace(deps.logger, ctx.traceId),
    usage,
    sink: deps.emit, // factory events forwarded verbatim
  });

  const modelOverride = tierToOverride(body.modelTier);
  const base = {
    provider: deps.provider,
    observer,
    ...(modelOverride ? { modelOverride } : {}),
    ...(deps.signal ? { signal: deps.signal } : {}),
  };

  try {
    let artifact: unknown;
    if (kind === 'design') {
      const { numSeeds } = body as DesignRequest;
      const result = await runDesignPhase({ ...base, ...(numSeeds ? { numSeeds } : {}) });
      artifact = result.game;
    } else if (kind === 'art') {
      const { game } = body as ArtRequest;
      const { pack } = await runArtPhase(game, base);
      artifact = pack;
    } else {
      // `code` runs `art` inline when no pack is supplied — the one within-phase chain we keep,
      // so "design → playable" is one call / one stream.
      const { game, pack: suppliedPack } = body as CodeRequest;
      let pack = suppliedPack;
      if (!pack) ({ pack } = await runArtPhase(game, base));
      const { bundle, report } = await runCodePhase(game, pack, base);
      artifact = { report, bundle };
    }
    deps.emit({ type: 'done', traceId: ctx.traceId, kind, artifact, usage: usage.totals() });
  } catch (err) {
    deps.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}
