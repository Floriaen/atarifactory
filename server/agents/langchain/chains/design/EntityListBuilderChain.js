// Minimal scaffold for TDD
const EntityListBuilderChain = {
  async invoke(input) {
    if (!input || typeof input !== 'object' || !input.mechanics) {
      throw new Error('Input must be an object with mechanics');
    }
    const result = {
      entities: ['player', 'platform', 'laser', 'timer']
    };
    if (!Array.isArray(result.entities)) {
      throw new Error('Output missing required entities array');
    }
    return result;
  }
};
module.exports = { EntityListBuilderChain };

