// Modernized FeedbackChain using standardized chain factory
// Receives: { runtimeLogs, stepId }
// Returns: { retryTarget: 'fixer' | 'planner', suggestion: string }

import { createJSONChain } from '../../../utils/chainFactory.js';
import { feedbackSchema } from '../../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'FeedbackChain',
  label: 'Feedback',
  description: 'Analyzing runtime logs and suggesting improvements',
  category: 'coding'
};

// Standardized async factory for the chain
async function createFeedbackChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'FeedbackChain',
    promptFile: 'coding/FeedbackChain.prompt.md',
    inputVariables: ['runtimeLogs', 'stepId'],
    schema: feedbackSchema,
    llm: llm, // Use provided LLM for backward compatibility
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createFeedbackChain };
