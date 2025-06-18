/**
 * GameDesignAgent
 * Input: SharedState
 * Required fields:
 * - title: string - The game title to generate design for
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
const { estimateTokens } = require('../utils/tokenUtils');

async function GameDesignAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { name, description } = sharedState;
    if (!name || !description) {
      throw new Error('GameDesignAgent: name and description are required in sharedState');
    }

    logger.info('GameDesignAgent called', { traceId, input: { name, description } });

    if (!llmClient) {
      throw new Error('GameDesignAgent: llmClient is required but was not provided');
    }

    // Load prompt
    const promptPath = path.join(__dirname, 'prompts/GameDesignAgent.prompt.md');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');

    // Compose prompt with invention
    const prompt = promptTemplate
      .replace('{{name}}', name)
      .replace('{{description}}', description);

    // Call LLM
    const parsed = await llmClient.chatCompletion({
      prompt,
      outputType: 'json-object'
    });

    // === TOKEN COUNT ===
    if (typeof sharedState.tokenCount !== 'number') sharedState.tokenCount = 0;
    sharedState.tokenCount += estimateTokens(prompt + JSON.stringify(parsed));
    if (typeof global.onStatusUpdate === 'function') {
      global.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
    }

    logger.info('GameDesignAgent LLM parsed output', { traceId, parsed });

    // Validate output structure
    if (!parsed.title || !parsed.description || !Array.isArray(parsed.mechanics) || !parsed.winCondition || !Array.isArray(parsed.entities)) {
      throw new Error('GameDesignAgent: LLM output missing required fields');
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