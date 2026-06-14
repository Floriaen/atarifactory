import {
  createRunContext,
  DEFAULT_MODEL,
  OPUS_MODEL,
  SONNET_MODEL,
  runArtPhase,
  runDesignPhase,
  type GameDefinition,
  type Logger,
  type LLMProvider,
  type ModelConfig,
} from '../../src/api.js';
import { createBus, type RunBus } from './bus.js';
import { buildStreamingObserver } from './observer.js';

export type ModelTier = 'default' | 'opus' | 'sonnet';

export function tierToOverride(tier: ModelTier | undefined): Partial<ModelConfig> | undefined {
  if (tier === 'opus') return { model: OPUS_MODEL };
  if (tier === 'sonnet') return { model: SONNET_MODEL };
  return undefined;
}

/** Design results the art phase can chain from, and final artifacts for late-join/reload. */
const designs = new Map<string, { traceId: string; title: string; game: GameDefinition }>();
const results = new Map<string, { kind: 'design' | 'art'; artifact: unknown; usage: unknown }>();

export function listDesigns(): Array<{ traceId: string; title: string }> {
  return [...designs.values()].map((d) => ({ traceId: d.traceId, title: d.title }));
}
export function getDesignGame(traceId: string): GameDefinition | undefined {
  return designs.get(traceId)?.game;
}
export function getResult(traceId: string) {
  return results.get(traceId);
}

interface BaseOpts {
  provider: LLMProvider;
  modelOverride?: Partial<ModelConfig>;
  logger: Logger;
  now: number;
}

export function startDesign(opts: BaseOpts & { numSeeds?: number }): { traceId: string; bus: RunBus } {
  const ctx = createRunContext({ model: DEFAULT_MODEL });
  const bus = createBus(ctx.traceId, opts.now);
  const { observer, usage, store } = buildStreamingObserver(ctx, bus, opts.logger);

  void (async () => {
    try {
      const result = await runDesignPhase({
        provider: opts.provider,
        observer,
        modelOverride: opts.modelOverride,
        ...(opts.numSeeds ? { numSeeds: opts.numSeeds } : {}),
      });
      const totals = usage.totals();
      await store.finalize({
        traceId: ctx.traceId,
        game: result.game,
        critique: result.critique,
        iterations: result.iterations,
        timings: observer.timings,
        usage: { totals, perModel: usage.perModel() },
      });
      designs.set(ctx.traceId, { traceId: ctx.traceId, title: result.game.title, game: result.game });
      results.set(ctx.traceId, { kind: 'design', artifact: result.game, usage: totals });
      bus.emit({ type: 'done', traceId: ctx.traceId, kind: 'design', artifact: result.game, usage: totals });
    } catch (err) {
      bus.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  })();

  return { traceId: ctx.traceId, bus };
}

export function startArt(opts: BaseOpts & { game: GameDefinition }): { traceId: string; bus: RunBus } {
  const ctx = createRunContext({ model: DEFAULT_MODEL });
  const bus = createBus(ctx.traceId, opts.now);
  const { observer, usage, store } = buildStreamingObserver(ctx, bus, opts.logger);

  void (async () => {
    try {
      const { pack } = await runArtPhase(opts.game, {
        provider: opts.provider,
        observer,
        modelOverride: opts.modelOverride,
      });
      const totals = usage.totals();
      await store.finalize({
        traceId: ctx.traceId,
        source: { title: opts.game.title },
        pack,
        timings: observer.timings,
        usage: { totals, perModel: usage.perModel() },
      });
      results.set(ctx.traceId, { kind: 'art', artifact: pack, usage: totals });
      bus.emit({ type: 'done', traceId: ctx.traceId, kind: 'art', artifact: pack, usage: totals });
    } catch (err) {
      bus.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  })();

  return { traceId: ctx.traceId, bus };
}
