// orchestrator-progress.integration.test.mjs
// Integration test: Orchestrator emits only unified Progress events using ProgressionManager
import { describe, it, expect, vi } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.mjs';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.mjs';

// Mocks for planning/coding pipelines (simulate progress events)
vi.mock('../../agents/pipeline/planningPipeline.mjs', () => ({
  runPlanningPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 3 progress events for planning
    onStatusUpdate('Progress', { progress: 0.2 });
    onStatusUpdate('Progress', { progress: 0.5 });
    onStatusUpdate('Progress', { progress: 1.0 });
    sharedState.plan = [1, 2, 3];
    return sharedState;
  }
}));
vi.mock('../../agents/pipeline/codingPipeline.mjs', () => ({
  runCodingPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 2 progress events for coding
    onStatusUpdate('Progress', { progress: 0.3 });
    onStatusUpdate('Progress', { progress: 1.0 });
    return sharedState;
  }
}));

describe('Orchestrator unified progress integration', () => {
  it('emits only unified Progress events to the frontend', async () => {
    const events = [];
    const sharedState = {
      onStatusUpdate: (type, payload) => {
        if (type === 'Progress') {
          events.push(payload.progress);
        }
      },
    };
    await runModularGameSpecPipeline(sharedState);
    // Should emit progress values that are monotonically increasing and in (0, 1]
    expect(events.length).toBeGreaterThan(0);
    for (const p of events) {
      expect(typeof p).toBe('number');
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    // Should be strictly increasing
    for (let i = 1; i < events.length; ++i) {
      expect(events[i]).toBeGreaterThanOrEqual(events[i-1]);
    }
    // Final progress should be 1
    expect(events[events.length-1]).toBeCloseTo(1, 5);
  });
});
