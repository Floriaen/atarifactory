// Minimal scaffold for TDD
const EntityListBuilderChain = {
  async invoke(input) {
    return {
      entities: ['player', 'platform', 'laser', 'timer']
    };
  }
};
module.exports = { EntityListBuilderChain };

