import { describe, it, expect } from 'vitest';
import { ClaudeProvider } from '../../src/llm/providers/claude.js';
import { runDesignPhase } from '../../src/design/runDesignPhase.js';
import { Observer } from '../../src/observability/observer.js';
import { UsageAggregator } from '../../src/observability/usage.js';
import { createLogger } from '../../src/observability/logger.js';
import { createRunContext } from '../../src/observability/runContext.js';
import { DEFAULT_MODEL } from '../../src/llm/models.js';

// One gated, live Claude run. Asserts structural invariants only — never exact text.
// Enable with: RUN_REAL_LLM=1 (needs ANTHROPIC_API_KEY).
const live = process.env.RUN_REAL_LLM ? describe : describe.skip;

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
