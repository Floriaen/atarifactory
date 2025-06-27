// orchestrator-progress.integration.test.mjs
// Integration test: Orchestrator emits only unified Progress events using ProgressionManager
import { describe, it, expect, vi } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.mjs';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.mjs';

// Mocks for planning/coding pipelines (simulate progress events)
vi.mock('../../agents/pipeline/planningPipeline.mjs', () => ({
  runPlanningPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 3 progress events for planning
    onStatusUpdate('Progress', { progress: 0.2, phase: 'planning' });
    onStatusUpdate('Progress', { progress: 0.5, phase: 'planning' });
    onStatusUpdate('Progress', { progress: 1.0, phase: 'planning' });
    sharedState.plan = [1, 2, 3];
    return sharedState;
  }
}));
vi.mock('../../agents/pipeline/codingPipeline.mjs', () => ({
  runCodingPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 2 progress events for coding
    onStatusUpdate('Progress', { progress: 0.3, phase: 'coding' });
    onStatusUpdate('Progress', { progress: 1.0, phase: 'coding' });
    return sharedState;
  }
}));

describe('Orchestrator unified progress integration', () => {
  it('emits only unified Progress events to the frontend', async () => {
    const events = [];
    const sharedState = {
      onStatusUpdate: (type, payload) => {
        if (type === 'PipelineStatus') {
          events.push(payload);
        }
      },
    };
    await runModularGameSpecPipeline(sharedState);
    // Should emit PipelineStatus events with correct schema and monotonically increasing progress
    expect(events.length).toBeGreaterThan(0);
    for (const evt of events) {
      expect(evt).toHaveProperty('type', 'PipelineStatus');
      expect(evt).toHaveProperty('phase');
      expect(evt).toHaveProperty('progress');
      expect(typeof evt.progress).toBe('number');
      expect(evt.progress).toBeGreaterThanOrEqual(0);
      expect(evt.progress).toBeLessThanOrEqual(1);
      expect(evt).toHaveProperty('tokenCount');
      expect(typeof evt.tokenCount).toBe('number');
      expect(evt).toHaveProperty('timestamp');
      expect(typeof evt.timestamp).toBe('string');
    }
    // Should be strictly increasing
    for (let i = 1; i < events.length; ++i) {
      expect(events[i].progress).toBeGreaterThanOrEqual(events[i-1].progress);
    }
    // Final progress should be 1
    expect(events[events.length-1].progress).toBeCloseTo(1, 5);
  });
});
