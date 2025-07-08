import { runCodingPipeline } from '../../agents/pipeline/codingPipeline.mjs';
import { createSharedState } from '../../types/SharedState.js';
import { CODING_PHASE } from '../../config/pipeline.config.mjs';

describe.skip('Token Count Modular Pipeline Integration', () => {
  it('should increment token count in sharedState and emit updates (modular pipeline)', async () => {
    const tokenCounts = [];
    const onStatusUpdate = (type, data) => {
      if (
        type === 'Progress' &&
        data &&
        typeof data.tokenCount === 'number' &&
        data.phase &&
        data.phase.name === CODING_PHASE.name
      ) {
        tokenCounts.push(data.tokenCount);
      }
    // This test expects sub-pipeline events, not orchestrator canonical events.
    };
    // Minimal sharedState for modular pipeline
    const sharedState = createSharedState();
    sharedState.title = 'Token Modular Game';
    sharedState.plan = [
      { id: 1, description: 'Set up the HTML canvas and main game loop' },
      { id: 2, description: 'Create the player entity and implement left/right movement' },
      { id: 3, description: 'Implement win condition when player reaches the right edge' }
    ];
    // Inject mock factories so no real LLM is called
    const factories = {
      createContextStepBuilderChain: async () => ({
        invoke: async () => '// mock code for test',
        pipe: function() { return this; }
      }),
      createFeedbackChain: async () => ({
        invoke: async () => ({ feedback: '{"suggestion":"Looks good!"}' }),
        pipe: function() { return this; }
      })
    };
    await runCodingPipeline(sharedState, onStatusUpdate, factories);
    const lastTokenCount = tokenCounts[tokenCounts.length - 1];
    expect(typeof lastTokenCount).toBe('number');
    expect(lastTokenCount).toBeGreaterThan(0);
    expect(sharedState.tokenCount).toBe(lastTokenCount);
  }, 20000);
});
