import logger from './logger.js';

// Shared LCEL mapping step to ensure LLM output has a .content property
// Usage: .pipe(RunnableLambda.from(ensureContentPresent))
export function ensureContentPresent(llmResult) {
  logger.debug('ensureContentPresent llmResult', { llmResult });
  if (!llmResult || typeof llmResult !== 'object' || !('content' in llmResult)) {
    throw new Error('LLM output missing content');
  }
  return llmResult;
}
