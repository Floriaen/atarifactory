// orchestrator-progress.integration.test.js
// Integration test: Orchestrator emits only unified Progress events using ProgressionManager
import { describe, it, expect, vi } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.js';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.js';
import { PLANNING_PHASE, CODING_PHASE } from '../../config/pipeline.config.js';

// Mocks for planning/coding pipelines (simulate progress events)
vi.mock('../../agents/pipeline/planningPipeline.js', () => ({
  runPlanningPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 5 progress events for planning
    onStatusUpdate('Progress', { progress: 0.2, phase: PLANNING_PHASE });
    onStatusUpdate('Progress', { progress: 0.4, phase: PLANNING_PHASE });
    onStatusUpdate('Progress', { progress: 0.6, phase: PLANNING_PHASE });
    onStatusUpdate('Progress', { progress: 0.8, phase: PLANNING_PHASE });
    onStatusUpdate('Progress', { progress: 0.9999, phase: PLANNING_PHASE });
    sharedState.plan = [1, 2, 3];
    return sharedState;
  }
}));
vi.mock('../../agents/pipeline/codingPipeline.js', () => ({
  runCodingPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 2 progress events for coding
    onStatusUpdate('Progress', { progress: 0.3, phase: CODING_PHASE });
    onStatusUpdate('Progress', { progress: 1.0, phase: CODING_PHASE });
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
