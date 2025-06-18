/**
 * ContextStepBuilderAgent (pipeline-v3)
 * Receives the full game source, current step, and plan.
 * Returns the complete revised JavaScript source by calling the injected llmClient.
 *
 * NOTE: This agent only handles JavaScript code, not HTML. The gameSource is always JS-only.
 *
 * @param {Object} sharedState - { gameSource, plan, currentStep }
 * @param {Object} options - { logger, traceId, llmClient }
 * @returns {Promise<string>} The revised game source.
 */
async function ContextStepBuilderAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    const { gameSource, plan, currentStep } = sharedState;
    if (gameSource == null || plan == null || currentStep == null) {
      throw new Error('ContextStepBuilderAgent: gameSource, plan, and currentStep are required in sharedState');
    }
    if (!llmClient) {
      throw new Error('ContextStepBuilderAgent: llmClient is required');
    }

    logger && logger.info && logger.info('ContextStepBuilderAgent called', { traceId, currentStep });

    // Load prompt template from file
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, 'prompts/ContextStepBuilderAgent.prompt.md');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');
    // Fill template
    const prompt = promptTemplate
      .replace('{{gameSource}}', gameSource)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace('{{step}}', JSON.stringify(currentStep, null, 2));

    // Call LLM
    let revisedSource = await llmClient.chatCompletion({ prompt, outputType: 'string', max_tokens: 4096 });

    // Only update if valid string, otherwise preserve last good code
    if (typeof revisedSource === 'string' && revisedSource.trim()) {
      sharedState.gameSource = revisedSource;
    } else {
      logger && logger.error && logger.error('LLM returned undefined/empty output for step', { traceId, currentStep });
      sharedState.metadata = sharedState.metadata || {};
      sharedState.metadata.llmError = `LLM output was undefined or empty for step: ${currentStep.description}`;
      // Do NOT overwrite sharedState.gameSource
    }
    sharedState.metadata.lastUpdate = new Date();
    return sharedState.gameSource;

  } catch (err) {
    logger && logger.error && logger.error('ContextStepBuilderAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = ContextStepBuilderAgent;
