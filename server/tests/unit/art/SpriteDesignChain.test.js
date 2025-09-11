import { describe, it, expect } from 'vitest';
import { MockLLM } from '../../helpers/MockLLM.js';
import { createSpriteMaskGenerator } from '../../../agents/chains/art/SpriteMaskGenerator.js';
import { compileSpriteDSL } from '../../../utils/sprites/dsl/compiler.js';

describe('SpriteMaskGenerator compiles sprites', () => {
  it('returns valid DSL and compiles to a mask', async () => {
    const mockJson = JSON.stringify({
      gridSize: 12,
      frames: [ { ops: ["rect 3 6 6 1", "rect 1 6 10 1", "pixel 2 6"] } ],
      meta: { entity: 'plane' }
    });
    const llm = new MockLLM(mockJson);
    const agent = await createSpriteMaskGenerator(llm);
    const mask = await agent.generate('plane', { gridSize: 12 });
    expect(mask).toBeDefined();
    expect(mask.gridSize).toBe(12);
    expect(Array.isArray(mask.frames)).toBe(true);
    // Ensure at least one pixel is set
    const anyOn = mask.frames[0].some(row => row.some(Boolean));
    expect(anyOn).toBe(true);
  });
});
