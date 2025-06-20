// Minimal scaffold for TDD
const IdeaGeneratorChain = {
  async invoke(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Input must be an object');
    }
    const result = {
      title: 'Laser Leap',
      pitch: 'Dodge lasers and leap between platforms.'
    };
    if (!result.title || !result.pitch) {
      throw new Error('Output missing required fields');
    }
    return result;
  }
};
module.exports = { IdeaGeneratorChain };
