import { describe, it, expect } from 'vitest';
import { compileSpriteDSL } from '../../../utils/sprites/dsl/compiler.js';

describe('SpriteDSL compiler', () => {
  it('compiles rect/line/pixel/mirror to a boolean mask', () => {
    const dsl = {
      gridSize: 12,
      frames: [
        { ops: ['rect 3 6 6 1', 'line 1 6 10 6', 'pixel 2 6', 'mirror H'] }
      ],
      meta: { entity: 'plane' }
    };
    const mask = compileSpriteDSL(dsl);
    expect(mask.gridSize).toBe(12);
    expect(mask.frames).toHaveLength(1);
    // Count filled pixels roughly
    const count = mask.frames[0].reduce((acc,row)=>acc+row.filter(Boolean).length,0);
    expect(count).toBeGreaterThan(5);
  });

  it('normalizes bad input and clamps values', () => {
    const dsl = { gridSize: 1000, frames: [{ ops: ['rect -5 -5 999 999'] }], meta: { entity: 'x' } };
    const mask = compileSpriteDSL(dsl);
    expect(mask.gridSize).toBeLessThanOrEqual(32);
    const count = mask.frames[0].reduce((acc,row)=>acc+row.filter(Boolean).length,0);
    expect(count).toBeGreaterThan(0);
  });
});

