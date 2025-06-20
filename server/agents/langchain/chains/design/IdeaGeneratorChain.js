// Minimal scaffold for TDD
const IdeaGeneratorChain = {
  async invoke(input) {
    return {
      title: 'Laser Leap',
      pitch: 'Dodge lasers and leap between platforms.'
    };
  }
};
module.exports = { IdeaGeneratorChain };
