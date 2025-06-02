/**
 * FeedbackAgent
 * Input: { runtimeLogs: any, stepId: number }
 * Output: { retryTarget: 'fixer' | 'planner', suggestion: string }
 *
 * Analyzes runtime logs and suggests the next agent/action.
 */
function FeedbackAgent({ runtimeLogs, stepId }) {
  // For the mock phase: if any runtime log value is false, suggest fixer; else planner
  if (runtimeLogs && Object.values(runtimeLogs).some(v => v === false)) {
    return { retryTarget: 'fixer', suggestion: 'Try fixing the last step.' };
  }
  return { retryTarget: 'planner', suggestion: 'Revise the build plan.' };
}

module.exports = FeedbackAgent; 