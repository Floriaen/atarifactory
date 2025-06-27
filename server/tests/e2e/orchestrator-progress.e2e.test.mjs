import { describe, it, expect, vi } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.mjs';

// Mock LLMs and all chains to simulate a realistic pipeline with multiple planning and coding steps
// We'll simulate a plan with 3 steps and coding with 4 steps
vi.mock('../../agents/pipeline/planningPipeline.mjs', () => ({
  runPlanningPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 3 planning progress events
    onStatusUpdate('PipelineStatus', { progress: 0.1 });
    onStatusUpdate('PipelineStatus', { progress: 0.5 });
    onStatusUpdate('PipelineStatus', { progress: 0.9 });
    sharedState.plan = [1, 2, 3];
    return sharedState;
  }
}));
vi.mock('../../agents/pipeline/codingPipeline.mjs', () => ({
  runCodingPipeline: async (sharedState, onStatusUpdate) => {
    // Simulate 4 coding progress events
    onStatusUpdate('PipelineStatus', { progress: 0.1 });
    onStatusUpdate('PipelineStatus', { progress: 0.5 });
    onStatusUpdate('PipelineStatus', { progress: 0.9 });
    return sharedState;
  }
}));

describe('Pipeline unified progress end-to-end contract', () => {
  it('never emits 1.0 progress except as the last event (regression test)', async () => {
    const events = [];
    const sharedState = {
      onStatusUpdate: (type, payload) => {
        if (type === 'PipelineStatus') {
          events.push(payload.progress);
        }
      },
    };
    await runModularGameSpecPipeline(sharedState);
    console.log('Unified progress events:', events);
    // All but the last event must be < 1.0
    for (let i = 0; i < events.length - 1; ++i) {
      expect(events[i]).toBeLessThan(1.0);
    }
    // The last event must be exactly 1.0
    expect(events[events.length - 1]).toBe(1.0);
  });
});
