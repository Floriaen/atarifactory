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
async function GameDesignAgent(input) {
  // Mock implementation for contract test
  return {
    title: input.title || 'Untitled Game',
    description: 'A fun game.',
    mechanics: ['move', 'jump'],
    winCondition: 'Reach the goal',
    entities: ['player', 'goal']
  };
}

module.exports = GameDesignAgent; 