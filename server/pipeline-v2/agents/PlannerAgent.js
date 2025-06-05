/**
 * PlannerAgent
 * Input: Game definition object (see GameDesignAgent output)
 * Output: Array<{ id: number, label: string }>
 *
 * Generates an ordered array of build steps for the game.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
const fs = require('fs');
const path = require('path');

async function PlannerAgent(gameDefinition, { logger, traceId, llmClient }) {
  logger.info('PlannerAgent called', { traceId, gameDefinition });
  try {
    // Load prompt from file
    const promptPath = path.join(__dirname, 'prompts', 'PlannerAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate.replace('{{gameDefinition}}', JSON.stringify(gameDefinition, null, 2));

    // If no llmClient, throw an error (no fallback)
    if (!llmClient) {
      logger.error('PlannerAgent: llmClient is required but was not provided', { traceId });
      throw new Error('PlannerAgent: llmClient is required but was not provided');
    }

    // Use llmClient for LLM call and output parsing
    const plan = await llmClient.chatCompletion({ prompt, outputType: 'json-array' });
    logger.info('PlannerAgent output', { traceId, plan });
    return plan;
  } catch (err) {
    logger.error('PlannerAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = PlannerAgent; 