import { runPlanningPipeline } from '../../agents/pipeline/planningPipeline.js';
import { createSharedState } from '../../types/SharedState.js';
import { createGameDesignChain } from '../../agents/chains/design/GameDesignChain.js';
import { PLANNING_PHASE } from '../../config/pipeline.config.js';

// Minimal mockLLM for token counting test
const mockLLM = {
  invoke: async () => ({ idea: 'Test Game', gameDef: { name: 'Test Game', mechanics: ['move'], winCondition: 'Do something', entities: ['player'] } })
};

describe('Planning Pipeline Token Counting', () => {
  it('should increment token count in sharedState and emit updates (planning pipeline)', async () => {
    const tokenCounts = [];
    const onStatusUpdate = (type, data) => {
      if (
        type === 'Progress' &&
        data &&
        typeof data.tokenCount === 'number' &&
        data.phase &&
        data.phase.name === PLANNING_PHASE.name
      ) {
        tokenCounts.push(data.tokenCount);
      }
    // This test expects sub-pipeline events, not orchestrator canonical events.
    };

    const sharedState = createSharedState();
    createGameDesignChain({
      llm: mockLLM,
      sharedState
    });
    sharedState.idea = { name: 'Test Game', description: 'A test game.' };
    // Any other required fields can be added here if needed by your pipeline
    await runPlanningPipeline(sharedState, onStatusUpdate);
    const lastTokenCount = tokenCounts[tokenCounts.length - 1];
    expect(typeof lastTokenCount).toBe('number');
    expect(lastTokenCount).toBeGreaterThan(0);
    expect(sharedState.tokenCount).toBe(lastTokenCount);
  }, 60000);
});
