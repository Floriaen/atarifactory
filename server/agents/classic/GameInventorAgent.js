// GameInventorAgent.js
// Responsible for inventing a new game idea: outputs name and description.
const fs = require('fs');
const path = require('path');

async function GameInventorAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    logger.info('GameInventorAgent called', { traceId });
    if (!llmClient) throw new Error('GameInventorAgent: llmClient is required');
    
    const promptPath = path.join(__dirname, './prompts/GameInventorAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    // Optionally interpolate theme or constraints here
    const prompt = promptTemplate; // Extend later for theme support

    const parsed = await llmClient.chatCompletion({
      prompt,
      outputType: 'json-object'
    });
    if (!parsed.name || !parsed.description) {
      throw new Error('GameInventorAgent: LLM output missing required fields');
    }
    sharedState.title = parsed.name;
    sharedState.name = parsed.name;
    sharedState.description = parsed.description;
    logger.info('GameInventorAgent LLM parsed output', { traceId, parsed });
    return { ...parsed };
  } catch (err) {
    logger.error('GameInventorAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = GameInventorAgent;
