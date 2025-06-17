/**
 * ContextStepFixerAgent (pipeline-v3)
 * Receives the full game source, plan, step, and errors.
 * Returns the fixed source by calling the injected llmClient.
 *
 * @param {Object} sharedState - { gameSource, plan, step, errors }
 * @param {Object} options - { logger, traceId, llmClient }
 * @returns {Promise<string>} The fixed game source.
 */
const fs = require('fs');
const path = require('path');

async function ContextStepFixerAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    const { gameSource, plan, step, errors } = sharedState;
    if (!gameSource || !plan || !step || !errors) {
      throw new Error('ContextStepFixerAgent: Missing required fields (gameSource, plan, step, errors)');
    }
    if (!llmClient) {
      throw new Error('ContextStepFixerAgent: llmClient is required');
    }
    // Load prompt template
    const promptPath = path.join(__dirname, 'prompts/ContextStepFixerAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{gameSource}}', gameSource)
      .replace('{{plan}}', JSON.stringify(plan, null, 2))
      .replace('{{step}}', JSON.stringify(step, null, 2))
      .replace('{{errors}}', JSON.stringify(errors, null, 2));
    // Call LLM
    const fixedSource = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    // Update sharedState
    sharedState.gameSource = fixedSource;
    sharedState.metadata = sharedState.metadata || {};
    sharedState.metadata.lastUpdate = new Date();
    return fixedSource;
  } catch (err) {
    logger && logger.error && logger.error('ContextStepFixerAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = ContextStepFixerAgent;
