import { describe, it, expect } from 'vitest';
import { fromMap } from '../../src/llm/providers/mock.js';
import { runArtPhase } from '../../src/art/runArtPhase.js';
import { testObserver } from '../helpers/observer.js';
import { spriteDslFixture, validGame } from '../helpers/fixtures.js';

describe('runArtPhase (mock)', () => {
  it('generates one valid sprite per entity', async () => {
    const provider = fromMap({ sprite: spriteDslFixture });
    const { observer, usage } = testObserver();

    const { pack } = await runArtPhase(validGame, { provider, observer });

    // validGame has entities: block, player
    expect(pack.schemaVersion).toBe('spritepack/v1');
    expect(Object.keys(pack.items).sort()).toEqual(['block', 'player']);

    // one LLM call per entity
    expect(usage.totals().calls).toBe(2);

    // every frame is gridSize² with ≥1 pixel
    for (const item of Object.values(pack.items)) {
      for (const frame of item.frames) {
        expect(frame.length).toBe(item.gridSize);
        expect(frame.every((row) => row.length === item.gridSize)).toBe(true);
        expect(frame.some((row) => row.some(Boolean))).toBe(true);
      }
    }
  });

  it('records a per-entity node timing, all ok', async () => {
    const provider = fromMap({ sprite: spriteDslFixture });
    const { observer } = testObserver();

    await runArtPhase(validGame, { provider, observer });

    const nodes = observer.timings.map((t) => t.node);
    expect(nodes).toContain('sprite:block');
    expect(nodes).toContain('sprite:player');
    expect(observer.timings.every((t) => t.status === 'ok')).toBe(true);
  });
});
