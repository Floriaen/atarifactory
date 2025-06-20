// Minimal scaffold for TDD
const PlayabilityHeuristicChain = {
  async invoke({ gameDef } = {}) {
    if (!gameDef || typeof gameDef !== 'object') {
      throw new Error('Input must have a gameDef object');
    }
    if (gameDef.winCondition) {
      return 'valid';
    }
    return 'invalid: missing win condition';
  }
};
module.exports = { PlayabilityHeuristicChain };

