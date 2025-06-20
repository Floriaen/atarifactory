// Minimal scaffold for TDD

const MechanicExtractorChain = {
  async invoke(input) {
    return {
      mechanics: ['move', 'jump', 'avoid']
    };
  }
};
module.exports = { MechanicExtractorChain };

