import { describe, it, expect } from 'vitest';
import { MockLLM } from '../../helpers/MockLLM.js';
import { createSpriteDesignChain } from '../../../agents/chains/art/SpriteDesignChain.js';
import { compileSpriteDSL } from '../../../utils/sprites/dsl/compiler.js';

describe('SpriteDesignChain + DSL compiler', () => {
  it('returns valid DSL and compiles to a mask', async () => {
    const mockJson = JSON.stringify({
      gridSize: 12,
      frames: [ { ops: ["rect 3 6 6 1", "rect 1 6 10 1", "pixel 2 6"] } ],
      meta: { entity: 'plane' }
    });
    const llm = new MockLLM(mockJson);
    const chain = await createSpriteDesignChain(llm);
    const dsl = await chain.invoke({ context: { entity: 'plane', gridSize: 12 } });
    expect(dsl).toBeDefined();
    expect(dsl.gridSize).toBe(12);
    expect(Array.isArray(dsl.frames)).toBe(true);
    expect(dsl.meta && dsl.meta.entity).toBe('plane');

    const mask = compileSpriteDSL(dsl);
    expect(mask).toBeDefined();
    expect(mask.gridSize).toBe(12);
    expect(Array.isArray(mask.frames)).toBe(true);
    // Ensure at least one pixel is set
    const anyOn = mask.frames[0].some(row => row.some(Boolean));
    expect(anyOn).toBe(true);
  });
});

