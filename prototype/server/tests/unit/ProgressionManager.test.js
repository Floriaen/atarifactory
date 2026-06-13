// ProgressionManager.test.js
// TDD: Unit tests for ProgressionManager unified pipeline progress logic
import { describe, it, expect, beforeEach } from 'vitest';

// Import ProgressionManager (will fail until implemented)
import { ProgressionManager } from '../../utils/progress/ProgressionManager.js';

describe('ProgressionManager', () => {
  let mgr;

  beforeEach(() => {
    // Example config: planning 30%, coding 70%
    mgr = new ProgressionManager([
      { name: 'planning', weight: 0.3 },
      { name: 'coding', weight: 0.7 },
    ]);
  });

  it('validates that weights sum to 1.0', () => {
    expect(() => new ProgressionManager([
      { name: 'a', weight: 0.5 },
      { name: 'b', weight: 0.6 },
    ])).toThrow(/weights.*1/);
  });

  it('returns 0 progress before any updates', () => {
    expect(mgr.getUnifiedProgress()).toBe(0);
  });

  it('maps local progress to unified progress (simple case)', () => {
    mgr.updatePhaseProgress('planning', 0.5); // 0.15
    expect(mgr.getUnifiedProgress()).toBeCloseTo(0.15, 5);
    mgr.updatePhaseProgress('coding', 0.0); // still 0.15
    expect(mgr.getUnifiedProgress()).toBeCloseTo(0.15, 5);
    mgr.updatePhaseProgress('coding', 0.5); // 0.15 + 0.35 = 0.5
    expect(mgr.getUnifiedProgress()).toBeCloseTo(0.5, 5);
  });

  it('handles skipped/optional phases', () => {
    mgr = new ProgressionManager([
      { name: 'planning', weight: 0.5 },
      { name: 'optional', weight: 0.2 },
      { name: 'coding', weight: 0.3 },
    ]);
    mgr.updatePhaseProgress('planning', 1);
    mgr.updatePhaseProgress('coding', 0.5);
    // optional not updated, should still work
    expect(mgr.getUnifiedProgress()).toBeCloseTo(0.5 + 0.15, 5);
  });

  it('resets state correctly between runs', () => {
    mgr.updatePhaseProgress('planning', 1);
    mgr.updatePhaseProgress('coding', 1);
    expect(mgr.getUnifiedProgress()).toBeCloseTo(1, 5);
    mgr.reset();
    expect(mgr.getUnifiedProgress()).toBe(0);
  });

  it('throws if updating unknown phase', () => {
    expect(() => mgr.updatePhaseProgress('notARealPhase', 0.5)).toThrow(/unknown/i);
  });

  it('throws if progress is out of bounds', () => {
    expect(() => mgr.updatePhaseProgress('planning', -0.1)).toThrow(/0.*1/);
    expect(() => mgr.updatePhaseProgress('planning', 1.1)).toThrow(/0.*1/);
  });

  it('handles dynamic pipelines (phases added/removed)', () => {
    // Simulate dynamic config
    mgr = new ProgressionManager([
      { name: 'a', weight: 0.5 },
      { name: 'b', weight: 0.5 },
    ]);
    mgr.updatePhaseProgress('a', 1);
    mgr.updatePhaseProgress('b', 1);
    expect(mgr.getUnifiedProgress()).toBeCloseTo(1, 5);
    // Remove phase b
    mgr = new ProgressionManager([
      { name: 'a', weight: 1.0 },
    ]);
    mgr.updatePhaseProgress('a', 0.5);
    expect(mgr.getUnifiedProgress()).toBeCloseTo(0.5, 5);
  });
});
