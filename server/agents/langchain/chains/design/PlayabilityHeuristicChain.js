// Minimal scaffold for TDD
const PlayabilityHeuristicChain = {
  async invoke({ gameDef }) {
    if (gameDef && gameDef.winCondition) {
      return 'valid';
    }
    return 'invalid: missing win condition';
  }
};
module.exports = { PlayabilityHeuristicChain };

