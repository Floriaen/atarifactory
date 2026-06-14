import { describe, it, expect } from 'vitest';
import { fromMap } from '../../src/llm/providers/mock.js';
import { runDesignPhase } from '../../src/design/runDesignPhase.js';
import type { Persona } from '../../src/design/personas.js';
import { testObserver } from '../helpers/observer.js';
import { draftFixture, passCritique, reviseMedium, seedFixture, selectionFixture } from '../helpers/fixtures.js';

const personas: Persona[] = [
  { name: 'minimalist', brief: 'strips to one idea' },
  { name: 'troll', brief: 'subverts expectations' },
];

describe('runDesignPhase (mock)', () => {
  it('accept path: produces a valid GameDefinition with 0 refinement iterations', async () => {
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: passCritique,
    });
    const { observer, usage } = testObserver();

    const { game, iterations } = await runDesignPhase({ provider, observer, personas });

    expect(game.schemaVersion).toBe('gamedef/v1');
    expect(game.coreVerb).toBe('stack');
    expect(iterations).toBe(0);
    // 2 diverge + 1 select + 1 elaborate + 1 critic
    expect(usage.totals().calls).toBe(5);
    expect(usage.totals().costUsd).toBeGreaterThan(0);
  });

  it('refines once when the critic asks, then accepts', async () => {
    let criticCalls = 0;
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: () => (criticCalls++ === 0 ? reviseMedium : passCritique),
    });
    const { observer } = testObserver();

    const { iterations } = await runDesignPhase({ provider, observer, personas });

    expect(iterations).toBe(1);
  });

  it('force-accepts at maxIterations when the critic never passes', async () => {
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: reviseMedium,
    });
    const { observer } = testObserver();

    const { game, iterations } = await runDesignPhase({
      provider,
      observer,
      personas,
      loop: { maxIterations: 2 },
    });

    expect(iterations).toBe(2);
    expect(game.schemaVersion).toBe('gamedef/v1');
  });

  it('reseeds to the next-best seed when the first never passes, and lands a pass', async () => {
    // maxIterations=2 → 3 critic calls exhaust seed 0 (all revise); seed 1 passes immediately.
    let criticCalls = 0;
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: () => (criticCalls++ < 3 ? reviseMedium : passCritique),
    });
    const { observer } = testObserver();

    const { critique, iterations } = await runDesignPhase({
      provider,
      observer,
      personas,
      loop: { maxIterations: 2, maxSeeds: 2 },
    });

    expect(critique.verdict).toBe('pass');
    expect(iterations).toBe(0); // the winning (second) seed passed on its first critic
    expect(observer.timings.map((t) => t.node)).toContain('elaborate@s1');
  });

  it('records node timings in the observer', async () => {
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: passCritique,
    });
    const { observer } = testObserver();

    await runDesignPhase({ provider, observer, personas });

    const nodes = observer.timings.map((t) => t.node);
    expect(nodes).toContain('diverge');
    expect(nodes).toContain('select');
    expect(nodes).toContain('elaborate');
    expect(nodes).toContain('critic');
    expect(observer.timings.every((t) => t.status === 'ok')).toBe(true);
  });
});
