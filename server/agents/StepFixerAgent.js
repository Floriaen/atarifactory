// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const path = require('path');
const { extractJsCodeBlocks } = require('../utils/formatter');

/**
 * StepFixerAgent
 * Input: SharedState
 * Output: string (corrected stepCode)
 *
 * Fixes the code for the current step based on errors using LLM.
 */
async function StepFixerAgent(sharedState, { logger, traceId, llmClient }) {
  logger.info('StepFixerAgent called', { traceId, step: sharedState.step, errorList: sharedState.errorList });
  if (!llmClient) {
    logger.error('StepFixerAgent: llmClient is required but was not provided', { traceId });
    throw new Error('StepFixerAgent: llmClient is required but was not provided');
  }
  try {
    const promptPath = path.join(__dirname, 'prompts', 'StepFixerAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', sharedState.currentCode)
      .replace('{{step}}', JSON.stringify(sharedState.step, null, 2))
      .replace('{{errorList}}', JSON.stringify(sharedState.errorList, null, 2));
    const correctedCode = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    logger.info('StepFixerAgent LLM output', { traceId, correctedCode });
    // Use markdown parser to extract JS code blocks
    const cleanCode = extractJsCodeBlocks(correctedCode);
    sharedState.stepCode = cleanCode;
    sharedState.metadata.lastUpdate = new Date();
    return cleanCode;
  } catch (err) {
    logger.error('StepFixerAgent error', { traceId, error: err, step: sharedState.step });
    throw err;
  }
}

module.exports = StepFixerAgent; 