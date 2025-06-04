const fs = require('fs');
const path = require('path');

// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

/**
 * StepBuilderAgent
 * Input: {
 *   currentCode: string,
 *   plan: Array<{ id: number, label: string }>,
 *   step: { id: number, label: string }
 * }
 * Output: string (code block for the step)
 *
 * Generates the code block for the current step using LLM.
 */
async function StepBuilderAgent({ currentCode, plan, step }, { logger, traceId, llmClient }) {
  logger.info('StepBuilderAgent called', { traceId, step });
  if (!llmClient) {
    logger.error('StepBuilderAgent: llmClient is required but was not provided', { traceId });
    throw new Error('StepBuilderAgent: llmClient is required but was not provided');
  }
  try {
    const promptPath = path.join(__dirname, 'prompts', 'StepBuilderAgent.prompt.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace(/{{label}}/g, step.label);
    const codeBlock = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    logger.info('StepBuilderAgent LLM output', { traceId, codeBlock });
    return codeBlock;
  } catch (err) {
    logger.error('StepBuilderAgent error', { traceId, error: err, step });
    throw err;
  }
}

module.exports = StepBuilderAgent; 