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
function FeedbackAgent({ runtimeLogs, stepId }, { logger, traceId }) {
  logger.info('FeedbackAgent called', { traceId, runtimeLogs, stepId });
  try {
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