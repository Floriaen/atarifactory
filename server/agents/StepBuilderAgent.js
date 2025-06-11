/**
 * StepBuilderAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - plan: Array<{id: number, label: string}> - The full build plan
 * - step: {id: number, label: string} - The current step to build
 * Output: string (code block for the step)
 *
 * Generates the code block for the current step using LLM.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const path = require('path');
const { extractJsCodeBlocks } = require('../utils/formatter');

async function StepBuilderAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode, plan, step } = sharedState;
    if (!currentCode) {
      throw new Error('StepBuilderAgent: currentCode is required in sharedState');
    }
    if (!plan || !Array.isArray(plan)) {
      throw new Error('StepBuilderAgent: plan array is required in sharedState');
    }
    if (!step || !step.id || !step.label) {
      throw new Error('StepBuilderAgent: step with id and label is required in sharedState');
    }

    logger.info('StepBuilderAgent called', { traceId, step });
    logger.info('StepBuilderAgent input:', { currentCode, plan, step });

    if (!llmClient) {
      logger.error('StepBuilderAgent: llmClient is required but was not provided', { traceId });
      throw new Error('StepBuilderAgent: llmClient is required but was not provided');
    }

    // Validate that the step exists in the plan
    if (!plan.some(p => p.id === step.id)) {
      logger.error('StepBuilderAgent: Invalid step ID', { traceId, step, plan });
      throw new Error(`Invalid step: Step with id ${step.id} does not exist`);
    }

    const promptPath = path.join(__dirname, 'prompts', 'StepBuilderAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace(/{{label}}/g, step.label);

    const codeBlock = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    logger.info('StepBuilderAgent LLM output', { traceId, codeBlock });

    // Use markdown parser to extract JS code blocks
    const cleanCode = extractJsCodeBlocks(codeBlock);
    logger.info('StepBuilderAgent output:', { traceId, cleanCode });

    // Update sharedState
    sharedState.currentCode = cleanCode;
    sharedState.metadata.lastUpdate = new Date();
    return cleanCode;
  } catch (err) {
    logger.error('StepBuilderAgent error', { traceId, error: err, step: sharedState.step });
    throw err;
  }
}

module.exports = StepBuilderAgent; 