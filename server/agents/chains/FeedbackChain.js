// Modernized FeedbackChain using standardized chain factory
// Receives: { runtimeLogs, stepId }
// Returns: { retryTarget: 'fixer' | 'planner', suggestion: string }

import { createJSONChain } from '../../utils/chainFactory.js';
import { feedbackSchema } from '../../schemas/langchain-schemas.js';

// Standardized async factory for the chain
async function createFeedbackChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'FeedbackChain',
    promptFile: 'FeedbackChain.prompt.md',
    inputVariables: ['runtimeLogs', 'stepId'],
    schema: feedbackSchema,
    llm: llm, // Use provided LLM for backward compatibility
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createFeedbackChain };
