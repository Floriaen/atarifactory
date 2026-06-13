import { runPlanningPipeline } from '../../agents/pipeline/planningPipeline.js';
import { createSharedState } from '../../types/SharedState.js';
import { createGameDesignChain } from '../../agents/chains/design/GameDesignChain.js';
import { PLANNING_PHASE } from '../../config/pipeline.config.js';

const RUN_OPENAI = process.env.RUN_OPENAI_INTEGRATIONS === '1';
const OPENAI_KEY_PRESENT = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
const maybeDescribe = RUN_OPENAI && OPENAI_KEY_PRESENT ? describe : describe.skip;

// Minimal mockLLM for token counting test
const mockLLM = {
  invoke: async () => ({ idea: 'Test Game', gameDef: { name: 'Test Game', mechanics: ['move'], winCondition: 'Do something', entities: ['player'] } }),
  withStructuredOutput(schema) {
    const self = this;
    return {
      invoke: async (input) => {
        const result = await self.invoke(input);
        return schema ? schema.parse(result) : result;
      },
      withConfig(config) {
        return {
          invoke: async (input) => {
            const result = await self.invoke(input);
            
            // Trigger handleLLMEnd callback manually for token counting
            if (config.callbacks) {
              config.callbacks.forEach(callback => {
                if (callback.handleLLMEnd) {
                  callback.handleLLMEnd({
                    llmOutput: {
                      tokenUsage: {
                        totalTokens: 100,
                        promptTokens: 50, 
                        completionTokens: 50
                      }
                    }
                  });
                }
              });
            }
            
            return schema ? schema.parse(result) : result;
          }
        };
      }
    };
  },
  withConfig(config) {
    const self = this;
    return {
      ...self,
      invoke: async (input) => {
        const result = await self.invoke(input);
        
        // Trigger handleLLMEnd callback manually for token counting
        if (config.callbacks) {
          config.callbacks.forEach(callback => {
            if (callback.handleLLMEnd) {
              callback.handleLLMEnd({
                llmOutput: {
                  tokenUsage: {
                    totalTokens: 100,
                    promptTokens: 50, 
                    completionTokens: 50
                  }
                }
              });
            }
          });
        }
        
        return result;
      }
    };
  }
};

maybeDescribe('Planning Pipeline Token Counting', () => {
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
    const chain = await createGameDesignChain({
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
