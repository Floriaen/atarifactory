import { describe, expect, it } from 'vitest';
import { progressPct } from '../../admin/web/src/lib/progress.js';

describe('progressPct', () => {
  it('is 0 before any node and 1 on done (done wins)', () => {
    expect(progressPct(undefined, 0, false)).toBe(0);
    expect(progressPct('select', 1, true)).toBe(1);
    expect(progressPct(undefined, 5, true)).toBe(1);
  });

  it('advances strictly across the design milestones', () => {
    const diverge = progressPct('diverge', 0, false);
    const select = progressPct('select', 1, false);
    const elaborate = progressPct('elaborate', 2, false);
    const critic2 = progressPct('critic#2', 5, false);
    expect(diverge).toBeLessThan(select);
    expect(select).toBeLessThan(elaborate);
    expect(elaborate).toBeLessThan(critic2);
  });

  it('stays in [0,1) while running, regardless of node', () => {
    for (const node of ['diverge', 'select', 'elaborate#3', 'critic', 'sprite:player', 'code:generate', 'code:fix#3', 'mystery']) {
      for (const steps of [0, 1, 5, 50]) {
        const p = progressPct(node, steps, false);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      }
    }
  });

  it('creeps upward with stepsDone in the art and code-fix loops', () => {
    expect(progressPct('sprite:a', 1, false)).toBeLessThan(progressPct('sprite:c', 3, false));
    expect(progressPct('code:fix#1', 2, false)).toBeLessThan(progressPct('code:fix#3', 4, false));
    // code:generate sits below the fix band
    expect(progressPct('code:generate', 1, false)).toBeLessThanOrEqual(progressPct('code:fix#1', 2, false));
  });

  it('steps through the code gate nodes: generate < smoke < review', () => {
    const generate = progressPct('code:generate', 1, false);
    const smoke = progressPct('code:smoke', 2, false);
    const review = progressPct('code:review', 3, false);
    expect(generate).toBeLessThan(smoke);
    expect(smoke).toBeLessThan(review);
    expect(progressPct('code:smoke', 2, false)).toBeLessThan(progressPct('code:smoke', 5, false));
  });
});
