// Minimal scaffold for TDD

const MechanicExtractorChain = {
  async invoke(input) {
    if (!input || typeof input !== 'object' || !input.loop) {
      throw new Error('Input must be an object with loop');
    }
    const result = {
      mechanics: ['move', 'jump', 'avoid']
    };
    if (!Array.isArray(result.mechanics)) {
      throw new Error('Output missing required mechanics array');
    }
    return result;
  }
};
module.exports = { MechanicExtractorChain };

