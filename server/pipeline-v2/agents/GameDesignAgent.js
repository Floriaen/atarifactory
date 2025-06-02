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
const fs = require('fs');
const path = require('path');

async function GameDesignAgent(input, { logger, traceId }) {
  logger.info('GameDesignAgent called', { traceId, input });
  try {
    // Load prompt from file
    const promptPath = path.join(__dirname, 'prompts', 'GameDesignAgent.txt');
    const prompt = fs.readFileSync(promptPath, 'utf8');

    // --- LLM call would go here ---
    // For now, just return the prompt and input for dry-run/testing
    return {
      _prompt: prompt,
      _input: input,
      // TODO: Replace with real LLM call and parsed output
      title: input.title || 'Untitled Game',
      description: 'A fun game.',
      mechanics: ['move', 'jump'],
      winCondition: 'Reach the goal',
      entities: ['player', 'goal']
    };
  } catch (err) {
    logger.error('GameDesignAgent error', { traceId, error: err, input });
    throw err;
  }
}

module.exports = GameDesignAgent; 