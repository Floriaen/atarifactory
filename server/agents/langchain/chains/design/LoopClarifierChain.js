// Minimal scaffold for TDD
const LoopClarifierChain = {
  async invoke(input) {
    if (!input || typeof input !== 'object' || !input.title || !input.pitch) {
      throw new Error('Input must be an object with title and pitch');
    }
    const result = {
      loop: 'Player jumps between platforms and dodges lasers.'
    };
    if (!result.loop || typeof result.loop !== 'string') {
      throw new Error('Output missing required loop string');
    }
    return result;
  }
};
module.exports = { LoopClarifierChain };

