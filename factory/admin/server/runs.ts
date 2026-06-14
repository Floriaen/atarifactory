import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createRunContext,
  DEFAULT_MODEL,
  OPUS_MODEL,
  SONNET_MODEL,
  runArtPhase,
  runCodePhase,
  runDesignPhase,
  type GameDefinition,
  type Logger,
  type LLMProvider,
  type ModelConfig,
  type SpritePack,
} from '../../src/api.js';
import { createBus, type RunBus } from './bus.js';
import { buildStreamingObserver } from './observer.js';

export type ModelTier = 'default' | 'opus' | 'sonnet';

export function tierToOverride(tier: ModelTier | undefined): Partial<ModelConfig> | undefined {
  if (tier === 'opus') return { model: OPUS_MODEL };
  if (tier === 'sonnet') return { model: SONNET_MODEL };
  return undefined;
}

/**
 * Session registries so each phase can chain off the one before it: the art phase off a design
 * run, the code phase off an art run. (Cached/persisted results are resolved from disk separately.)
 */
const designs = new Map<string, { traceId: string; title: string; game: GameDefinition }>();
const arts = new Map<string, { traceId: string; title: string; game: GameDefinition; pack: SpritePack }>();
const results = new Map<string, { kind: 'design' | 'art' | 'code'; artifact: unknown; usage: unknown }>();

export function listDesigns(): Array<{ traceId: string; title: string }> {
  return [...designs.values()].map((d) => ({ traceId: d.traceId, title: d.title }));
}
export function getDesignGame(traceId: string): GameDefinition | undefined {
  return designs.get(traceId)?.game;
}
export function listArts(): Array<{ traceId: string; title: string }> {
  return [...arts.values()].map((a) => ({ traceId: a.traceId, title: a.title }));
}
export function getArt(traceId: string): { game: GameDefinition; pack: SpritePack } | undefined {
  const a = arts.get(traceId);
  return a ? { game: a.game, pack: a.pack } : undefined;
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
      // Persist the game alongside the pack so a later code run can chain off this trace on disk.
      await store.finalize({
        traceId: ctx.traceId,
        source: { title: opts.game.title },
        game: opts.game,
        pack,
        timings: observer.timings,
        usage: { totals, perModel: usage.perModel() },
      });
      arts.set(ctx.traceId, { traceId: ctx.traceId, title: opts.game.title, game: opts.game, pack });
      results.set(ctx.traceId, { kind: 'art', artifact: pack, usage: totals });
      bus.emit({ type: 'done', traceId: ctx.traceId, kind: 'art', artifact: pack, usage: totals });
    } catch (err) {
      bus.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  })();

  return { traceId: ctx.traceId, bus };
}

/**
 * The coding phase (M3): from a `game` plus its sprites, author + gate a playable bundle. The
 * `pack` may be supplied (chaining off an art result) OR omitted (chaining straight off a design —
 * the art phase then runs inline first, streaming into the same observer). Writes the bundle under
 * `runs/<traceId>/game/` so `make play TRACE=<id>` works on admin runs too, and emits a `done`
 * whose artifact is `{ report, bundle }`.
 */
export function startCode(opts: BaseOpts & { game: GameDefinition; pack?: SpritePack }): { traceId: string; bus: RunBus } {
  const ctx = createRunContext({ model: DEFAULT_MODEL });
  const bus = createBus(ctx.traceId, opts.now);
  const { observer, usage, store } = buildStreamingObserver(ctx, bus, opts.logger);

  void (async () => {
    try {
      let pack = opts.pack;
      if (!pack) {
        ({ pack } = await runArtPhase(opts.game, {
          provider: opts.provider,
          observer,
          modelOverride: opts.modelOverride,
        }));
      }
      const { bundle, report } = await runCodePhase(opts.game, pack, {
        provider: opts.provider,
        observer,
        modelOverride: opts.modelOverride,
      });
      const totals = usage.totals();

      const gameDir = `runs/${ctx.traceId}/game`;
      await mkdir(gameDir, { recursive: true });
      await Promise.all(bundle.files.map((f) => writeFile(join(gameDir, f.path), f.contents)));

      // The report rides the trace, NOT the bundle's files[].
      await store.finalize({
        traceId: ctx.traceId,
        source: { title: opts.game.title },
        gameId: bundle.gameId,
        entry: bundle.entry,
        report,
        timings: observer.timings,
        usage: { totals, perModel: usage.perModel() },
      });
      results.set(ctx.traceId, { kind: 'code', artifact: { report, bundle }, usage: totals });
      bus.emit({ type: 'done', traceId: ctx.traceId, kind: 'code', artifact: { report, bundle }, usage: totals });
    } catch (err) {
      bus.emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  })();

  return { traceId: ctx.traceId, bus };
}
