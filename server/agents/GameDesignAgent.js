/**
 * GameDesignAgent
 * Input: SharedState
 * Output: {
 *   title: string,
 *   description: string,
 *   mechanics: string[],
 *   winCondition: string,
 *   entities: string[]
 * }
 *
 * Generates a game design specification from a title.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const fs = require('fs');
const path = require('path');
const { SmartOpenAI } = require('../utils/SmartOpenAI');

async function GameDesignAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    logger.info('GameDesignAgent called', { traceId, input: { title: sharedState.title } });

    if (!llmClient) {
      throw new Error('GameDesignAgent: llmClient is required but was not provided');
    }

    // Load prompt
    const promptPath = path.join(__dirname, 'prompts/GameDesignAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');

    // Compose prompt
    const prompt = promptTemplate;

    // Call LLM
    const parsed = await llmClient.chatCompletion({
      prompt,
      outputType: 'json-object'
    });

    logger.info('GameDesignAgent LLM parsed output', { traceId, parsed });

    // Validate output structure
    if (!parsed.title || !parsed.description || !Array.isArray(parsed.mechanics) || !parsed.winCondition || !Array.isArray(parsed.entities)) {
      throw new Error('GameDesignAgent: LLM output missing required fields');
    }

    // Initialize metadata if it doesn't exist
    if (!sharedState.metadata) {
      sharedState.metadata = {};
    }

    // Update sharedState
    sharedState.gameDef = { ...parsed };
    sharedState.metadata.lastUpdate = new Date();

    return { ...parsed };
  } catch (err) {
    logger.error('GameDesignAgent error', { traceId, error: err, input: { title: sharedState.title } });
    throw err;
  }
}

module.exports = GameDesignAgent; 