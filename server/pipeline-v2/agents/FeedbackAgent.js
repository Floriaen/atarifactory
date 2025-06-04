/**
 * FeedbackAgent
 * Input: { runtimeLogs: any, stepId: number }
 * Output: { retryTarget: 'fixer' | 'planner', suggestion: string }
 *
 * Analyzes runtime logs and suggests the next agent/action.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
function FeedbackAgent({ runtimeLogs, stepId }, { logger, traceId, llmClient }) {
  logger.info('FeedbackAgent called', { traceId, runtimeLogs, stepId });
  try {
    if (llmClient) {
      // Compose prompt for LLM
      const prompt = `You are a game pipeline feedback agent. Given the following runtime logs and stepId, decide whether the next action should be to retry the fixer agent or the planner agent. Respond with a JSON object: { retryTarget: 'fixer' | 'planner', suggestion: string }\n\nRUNTIME LOGS:\n${JSON.stringify(runtimeLogs, null, 2)}\nSTEP ID: ${stepId}`;
      // Synchronous fallback for now, but should be async if LLM is used
      // (for compatibility, we use .then if llmClient returns a promise)
      const result = llmClient.chatCompletion({ prompt, outputType: 'json-object' });
      if (typeof result.then === 'function') {
        // If it's a promise, return a promise
        return result;
      }
      return result;
    }
    // For the mock phase: if any runtime log value is false, suggest fixer; else planner
    if (runtimeLogs && Object.values(runtimeLogs).some(v => v === false)) {
      return { retryTarget: 'fixer', suggestion: 'Try fixing the last step.' };
    }
    return { retryTarget: 'planner', suggestion: 'Revise the build plan.' };
  } catch (err) {
    logger.error('FeedbackAgent error', { traceId, error: err, runtimeLogs, stepId });
    throw err;
  }
}

module.exports = FeedbackAgent; 