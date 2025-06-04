const fs = require('fs');
const path = require('path');
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

/**
 * StepFixerAgent
 * Input: {
 *   currentCode: string,
 *   step: { id: number, label: string },
 *   errorList: Array<string>
 * }
 * Output: string (corrected stepCode)
 *
 * Fixes the code for the current step based on errors using LLM.
 */
async function StepFixerAgent({ currentCode, step, errorList }, { logger, traceId, llmClient }) {
  logger.info('StepFixerAgent called', { traceId, step, errorList });
  if (!llmClient) {
    logger.error('StepFixerAgent: llmClient is required but was not provided', { traceId });
    throw new Error('StepFixerAgent: llmClient is required but was not provided');
  }
  try {
    const promptPath = path.join(__dirname, 'prompts', 'StepFixerAgent.prompt.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{step}}', JSON.stringify(step, null, 2))
      .replace('{{errorList}}', JSON.stringify(errorList, null, 2));
    const correctedCode = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    logger.info('StepFixerAgent LLM output', { traceId, correctedCode });
    return correctedCode;
  } catch (err) {
    logger.error('StepFixerAgent error', { traceId, error: err, step });
    throw err;
  }
}

module.exports = StepFixerAgent; 