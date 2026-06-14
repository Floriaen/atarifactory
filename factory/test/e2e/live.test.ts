import { describe, it, expect } from 'vitest';
import { ClaudeProvider } from '../../src/llm/providers/claude.js';
import { runDesignPhase } from '../../src/design/runDesignPhase.js';
import { runArtPhase } from '../../src/art/runArtPhase.js';
import { runCodePhase } from '../../src/coding/runCodePhase.js';
import { parseSpritePack } from '../../src/contracts/spritePack.js';
import { parseGameBundle } from '../../src/contracts/gameBundle.js';
import { Observer } from '../../src/observability/observer.js';
import { UsageAggregator } from '../../src/observability/usage.js';
import { createLogger } from '../../src/observability/logger.js';
import { createRunContext } from '../../src/observability/runContext.js';
import { DEFAULT_MODEL } from '../../src/llm/models.js';
import { validGame } from '../helpers/fixtures.js';

// One gated, live Claude run. Asserts structural invariants only — never exact text.
// Enable with: RUN_REAL_LLM=1 (needs ANTHROPIC_API_KEY).
const live = process.env.RUN_REAL_LLM ? describe : describe.skip;

function liveObserver(): { observer: Observer; usage: UsageAggregator } {
  const usage = new UsageAggregator();
  const observer = new Observer({
    ctx: createRunContext({ model: DEFAULT_MODEL }),
    logger: createLogger({ level: 'silent' }),
    usage,
  });
  return { observer, usage };
}

live('live design phase (claude-opus-4-8)', () => {
  it('produces a contract-valid GameDefinition and bills cost', async () => {
    const provider = new ClaudeProvider();
    const usage = new UsageAggregator();
    const observer = new Observer({
      ctx: createRunContext({ model: DEFAULT_MODEL }),
      logger: createLogger({ level: 'silent' }),
      usage,
    });

    const { game, iterations } = await runDesignPhase({
      provider,
      observer,
      numSeeds: 3,
    });

    expect(game.schemaVersion).toBe('gamedef/v1');
    expect(game.coreVerb.length).toBeGreaterThan(0);
    expect(game.hook.length).toBeGreaterThan(0);
    expect(game.mechanics.length).toBeGreaterThanOrEqual(1);
    expect(game.mechanics.length).toBeLessThanOrEqual(2);
    expect(game.entities.length).toBeLessThanOrEqual(3);
    expect(iterations).toBeLessThanOrEqual(2);
    expect(usage.totals().costUsd).toBeGreaterThan(0);
  }, 180_000);
});

live('live art phase (sprite generation)', () => {
  it('produces a contract-valid SpritePack, one item per entity, with cost', async () => {
    const provider = new ClaudeProvider();
    const { observer, usage } = liveObserver();

    const { pack } = await runArtPhase(validGame, { provider, observer });

    expect(() => parseSpritePack(pack)).not.toThrow();
    expect(Object.keys(pack.items).sort()).toEqual(validGame.entities.map((e) => e.id).sort());
    for (const item of Object.values(pack.items)) {
      expect(item.frames.length).toBeGreaterThanOrEqual(1);
      for (const frame of item.frames) {
        expect(frame.length).toBe(item.gridSize);
        expect(frame.some((row) => row.some(Boolean))).toBe(true);
      }
    }
    expect(usage.totals().costUsd).toBeGreaterThan(0);
  }, 120_000);
});

live('live code phase (game generation, real headless browser)', () => {
  it('produces a contract-valid, passing GameBundle and bills cost', async () => {
    const provider = new ClaudeProvider();
    const { observer, usage } = liveObserver();

    const { pack } = await runArtPhase(validGame, { provider, observer });
    const { bundle, report } = await runCodePhase(validGame, pack, { provider, observer });

    expect(() => parseGameBundle(bundle)).not.toThrow();
    expect(report.passed).toBe(true); // every check — the real bar for a shippable game
    expect(usage.totals().costUsd).toBeGreaterThan(0);
  }, 300_000);
});
