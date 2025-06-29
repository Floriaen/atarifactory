const fs = require('fs');
const path = require('path');
const { estimateTokens } = require('../utils/tokenUtils');
/**
 * FeedbackAgent
 * Input: SharedState
 * Required fields:
 * - runtimeResults: object - Runtime playability results
 * - stepId: string - Current step ID
 * Output: string (feedback message)
 *
 * Analyzes runtime logs and suggests actions based on playability results.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

async function FeedbackAgent(sharedState, { traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { runtimeResults, currentStep } = sharedState;
    if (!runtimeResults) {
      throw new Error('FeedbackAgent: runtimeResults is required in sharedState');
    }
    if (!currentStep || !currentStep.id) {
      throw new Error('FeedbackAgent: currentStep.id is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('FeedbackAgent: llmClient is required');
    }

    logger.info('FeedbackAgent called', { traceId });
    
    // Load prompt from file
    const promptPath = path.join(__dirname, './prompts/FeedbackAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{runtimeLogs}}', JSON.stringify(runtimeResults, null, 2))
      .replace('{{stepId}}', currentStep.id);
    const result = llmClient.chatCompletion({ prompt, outputType: 'json-object' });
    if (typeof result.then === 'function') {
      return result.then(feedback => {
        // === TOKEN COUNT ===
        if (typeof sharedState.tokenCount !== 'number') sharedState.tokenCount = 0;
        sharedState.tokenCount += estimateTokens(prompt + JSON.stringify(feedback));
        if (typeof global.onStatusUpdate === 'function') {
          global.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
        }
        sharedState.metadata.lastUpdate = new Date();
        sharedState.metadata.feedback = feedback;
        return feedback;
      });
    }
    // === TOKEN COUNT ===
    if (typeof sharedState.tokenCount !== 'number') sharedState.tokenCount = 0;
    sharedState.tokenCount += estimateTokens(prompt + JSON.stringify(result));
    if (typeof global.onStatusUpdate === 'function') {
      global.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
    }
    sharedState.metadata.lastUpdate = new Date();
    sharedState.metadata.feedback = result;
    return result;
  } catch (error) {
    logger.error('Error in FeedbackAgent:', error);
    throw error;
  }
}

module.exports = FeedbackAgent; 