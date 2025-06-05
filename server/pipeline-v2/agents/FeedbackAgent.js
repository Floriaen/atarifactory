const fs = require('fs');
const path = require('path');
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
      // Load prompt from file
      const promptPath = path.join(__dirname, 'prompts', 'FeedbackAgent.prompt.md');
      const promptTemplate = fs.readFileSync(promptPath, 'utf8');
      const prompt = promptTemplate
        .replace('{{runtimeLogs}}', JSON.stringify(runtimeLogs, null, 2))
        .replace('{{stepId}}', stepId);
      const result = llmClient.chatCompletion({ prompt, outputType: 'json-object' });
      if (typeof result.then === 'function') {
        return result;
      }
      return result;
    }
    // If no llmClient, throw an error (no fallback)
    if (!llmClient) {
      logger.error('FeedbackAgent: llmClient is required but was not provided', { traceId });
      throw new Error('FeedbackAgent: llmClient is required but was not provided');
    }
  } catch (err) {
    logger.error('FeedbackAgent error', { traceId, error: err, runtimeLogs, stepId });
    throw err;
  }
}

module.exports = FeedbackAgent; 