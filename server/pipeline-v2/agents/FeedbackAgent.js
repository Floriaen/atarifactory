/**
 * FeedbackAgent
 * Input: { runtimeLogs: any, stepId: number }
 * Output: { retryTarget: 'fixer' | 'planner', suggestion: string }
 *
 * Analyzes runtime logs and suggests the next agent/action.
 */
function FeedbackAgent({ runtimeLogs, stepId }) {
  // Mock implementation for contract test
  return { retryTarget: 'fixer', suggestion: 'Try fixing the last step.' };
}

module.exports = FeedbackAgent; 