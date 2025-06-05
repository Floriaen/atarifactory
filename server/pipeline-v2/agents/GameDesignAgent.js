/**
 * GameDesignAgent
 * Input: { title: string }
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
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function GameDesignAgent(input, { logger, traceId, llmClient }) {
  logger.info('GameDesignAgent called', { traceId, input });
  try {
    // Load prompt from file
    const promptPath = path.join(__dirname, 'prompts', 'GameDesignAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');

    // If no llmClient, throw an error (no fallback)
    if (!llmClient) {
      logger.error('GameDesignAgent: llmClient is required but was not provided', { traceId });
      throw new Error('GameDesignAgent: llmClient is required but was not provided');
    }

    // Compose the prompt
    const prompt = `${promptTemplate.trim()}
\nInput:\n${JSON.stringify({ title: input.title })}`;

    // Use llmClient for LLM call and output parsing
    const parsed = await llmClient.chatCompletion({ prompt, outputType: 'json-object' });
    logger.info('GameDesignAgent LLM parsed output', { traceId, parsed });

    // Validate contract
    const { title, description, mechanics, winCondition, entities } = parsed;
    if (!title || !description || !Array.isArray(mechanics) || !winCondition || !Array.isArray(entities)) {
      logger.error('GameDesignAgent LLM output missing required fields', { traceId, parsed });
      throw new Error('GameDesignAgent: LLM output missing required fields');
    }

    return { ...parsed };
  } catch (err) {
    logger.error('GameDesignAgent error', { traceId, error: err, input });
    throw err;
  }
}

module.exports = GameDesignAgent; 