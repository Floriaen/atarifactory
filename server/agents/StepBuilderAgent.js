/**
 * StepBuilderAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - plan: Array<{id: number, label: string}> - The full build plan
 * - currentStep: {id: number, label: string} - The current step to build
 * Output: string (code block for the step)
 *
 * Generates the code block for the current step using LLM.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const path = require('path');
const { estimateTokens } = require('../utils/tokenUtils');
const { extractJsCodeBlocks } = require('../utils/formatter');

async function StepBuilderAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode, plan, currentStep } = sharedState;
    if (currentCode === undefined) {
      throw new Error('StepBuilderAgent: currentCode is required in sharedState');
    }
    if (!plan || !Array.isArray(plan)) {
      throw new Error('StepBuilderAgent: plan array is required in sharedState');
    }
    if (!currentStep || !currentStep.id || !currentStep.description) {
      throw new Error('StepBuilderAgent: currentStep with id and description is required in sharedState');
    }

    logger.info('StepBuilderAgent called', { traceId, step: currentStep });
    logger.info('StepBuilderAgent input:', { currentCode, plan, step: currentStep });

    if (!llmClient) {
      logger.error('StepBuilderAgent: llmClient is required but was not provided', { traceId });
      throw new Error('StepBuilderAgent: llmClient is required but was not provided');
    }

    // Validate that the step exists in the plan
    if (!plan.some(p => p.id === currentStep.id)) {
      logger.error('StepBuilderAgent: Invalid step ID', { traceId, step: currentStep, plan });
      throw new Error(`Invalid step: Step with id ${currentStep.id} does not exist`);
    }

    const promptPath = path.join(__dirname, 'prompts', 'StepBuilderAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace(/{{description}}/g, currentStep.description);

    logger.info('StepBuilderAgent prompt:', { 
      traceId,
      prompt,
      currentCode: currentCode || '(empty)',
      plan: JSON.stringify(plan),
      step: currentStep
    });

    const codeBlock = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    // === TOKEN COUNT ===
    if (typeof sharedState.tokenCount !== 'number') sharedState.tokenCount = 0;
    sharedState.tokenCount += estimateTokens(prompt + String(codeBlock));
    if (typeof global.onStatusUpdate === 'function') {
      global.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
    }

    // Use markdown parser to extract JS code blocks
    const cleanCode = extractJsCodeBlocks(codeBlock);
    logger.info('StepBuilderAgent cleaned code:', { traceId, cleanCode });
    if (typeof cleanCode === 'string' && cleanCode.trim()) {
      sharedState.currentCode = cleanCode;
    } else {
      logger.error('LLM returned undefined/empty output for step builder', { traceId, step: sharedState.currentStep });
      sharedState.metadata = sharedState.metadata || {};
      sharedState.metadata.llmError = `LLM output was undefined or empty for step builder: ${sharedState.currentStep && sharedState.currentStep.description}`;
      // Do NOT overwrite sharedState.currentCode
    }
    sharedState.metadata.lastUpdate = new Date();
    return sharedState.currentCode;

  } catch (err) {
    logger.error('StepBuilderAgent error', { traceId, error: err, step: sharedState.currentStep });
    throw err;
  }
}

module.exports = StepBuilderAgent; 