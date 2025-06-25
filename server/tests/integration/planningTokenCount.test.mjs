import { runPlanningPipeline } from '../../agents/pipeline/planningPipeline.mjs';
import { createSharedState } from '../../types/SharedState.js';
import { createGameDesignChain } from '../../agents/chains/design/GameDesignChain.mjs';

// Minimal mockLLM for token counting test
const mockLLM = {
  invoke: async () => ({ idea: 'Test Game', gameDef: { name: 'Test Game', mechanics: ['move'], winCondition: 'Do something', entities: ['player'] } })
};

describe('Planning Pipeline Token Counting', () => {
  it('should increment token count in sharedState and emit updates (planning pipeline)', async () => {
    const tokenCounts = [];
    const onStatusUpdate = (step, data) => {
      if (step === 'PlanningStep' && data && typeof data.tokenCount === 'number') tokenCounts.push(data.tokenCount);
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
  }, 20000);
});
