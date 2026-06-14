import { describe, it, expect } from 'vitest';
import { Observer } from '../../src/observability/observer.js';
import { UsageAggregator } from '../../src/observability/usage.js';
import { createLogger } from '../../src/observability/logger.js';
import { createRunContext } from '../../src/observability/runContext.js';
import type { FactoryEvent } from '../../src/observability/events.js';
import { fromMap } from '../../src/llm/providers/mock.js';
import { runDesignPhase } from '../../src/design/runDesignPhase.js';
import { runArtPhase } from '../../src/art/runArtPhase.js';
import { SONNET_MODEL } from '../../src/llm/models.js';
import type { Persona } from '../../src/design/personas.js';
import {
  draftFixture,
  passCritique,
  seedFixture,
  selectionFixture,
  spriteDslFixture,
  validGame,
} from '../helpers/fixtures.js';

function sinkObserver() {
  const calls: FactoryEvent[] = [];
  const observer = new Observer({
    ctx: createRunContext({ model: 'mock' }),
    logger: createLogger({ level: 'silent' }),
    usage: new UsageAggregator(),
    sink: (e) => calls.push(e),
  });
  return { observer, models: () => calls.filter((e) => e.type === 'llm_call').map((e) => e.model) };
}

const personas: Persona[] = [{ name: 'minimalist', brief: 'strips to one idea' }];

describe('host-driven modelOverride seam', () => {
  it('design: applies the override to every chain (including the critic)', async () => {
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: passCritique,
    });
    const { observer, models } = sinkObserver();

    await runDesignPhase({ provider, observer, personas, modelOverride: { model: SONNET_MODEL } });

    const used = models();
    expect(used.length).toBe(4); // 1 diverge + select + elaborate + critic
    expect(used.every((m) => m === SONNET_MODEL)).toBe(true);
  });

  it('art: applies the override to the sprite chain', async () => {
    const provider = fromMap({ sprite: spriteDslFixture });
    const { observer, models } = sinkObserver();

    await runArtPhase(validGame, { provider, observer, modelOverride: { model: SONNET_MODEL } });

    const used = models();
    expect(used.length).toBe(2); // one per entity
    expect(used.every((m) => m === SONNET_MODEL)).toBe(true);
  });
});
