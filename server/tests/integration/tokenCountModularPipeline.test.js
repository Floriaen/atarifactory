const { runCodingPipeline } = require('../../agents/langchain/pipeline/codingPipeline');
const { createSharedState } = require('../../types/SharedState');

describe('Token Count Modular Pipeline Integration', () => {
  it('should increment token count in sharedState and emit updates (modular pipeline)', async () => {
    const tokenCounts = [];
    const onStatusUpdate = (step, data) => {
      if (step === 'TokenCount' && data && typeof data.tokenCount === 'number') tokenCounts.push(data.tokenCount);
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
  });
});
