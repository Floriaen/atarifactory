/**
 * ContextStepBuilderAgent (pipeline-v3)
 * Receives the full game source, current step, and plan.
 * Returns the complete revised source by calling the injected llmClient.
 *
 * @param {Object} sharedState - { gameSource, plan, step }
 * @param {Object} options - { logger, traceId, llmClient }
 * @returns {Promise<string>} The revised game source.
 */
async function ContextStepBuilderAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    const { gameSource, plan, step } = sharedState;
    if (!gameSource || !plan || !step) {
      throw new Error('ContextStepBuilderAgent: gameSource, plan, and step are required in sharedState');
    }
    if (!llmClient) {
      throw new Error('ContextStepBuilderAgent: llmClient is required');
    }

    logger && logger.info && logger.info('ContextStepBuilderAgent called', { traceId, step });

    // Load prompt template from file
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, 'prompts/ContextStepBuilderAgent.prompt.md');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');
    // Fill template
    const prompt = promptTemplate
      .replace('{{gameSource}}', gameSource)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace('{{step}}', JSON.stringify(step, null, 2));

    // Call LLM
    const revisedSource = await llmClient.chatCompletion({ prompt, outputType: 'string' });

    // Optionally: update sharedState
    sharedState.gameSource = revisedSource;
    sharedState.metadata = sharedState.metadata || {};
    sharedState.metadata.lastUpdate = new Date();

    return revisedSource;
  } catch (err) {
    logger && logger.error && logger.error('ContextStepBuilderAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = ContextStepBuilderAgent;
