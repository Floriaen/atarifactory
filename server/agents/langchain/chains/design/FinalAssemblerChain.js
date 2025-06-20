// Minimal scaffold for TDD
const FinalAssemblerChain = {
  async invoke(input) {
    return {
      gameDef: {
        name: input.title || 'Laser Leap', // alias for title for test compatibility
        title: input.title || 'Laser Leap',
        description: input.pitch || 'Dodge lasers and leap between platforms.',
        mechanics: input.mechanics || ['move', 'jump', 'avoid'],
        winCondition: input.winCondition || 'Survive for 45 seconds',
        entities: input.entities || ['player', 'platform', 'laser', 'timer']
      }
    };
  }
};
module.exports = { FinalAssemblerChain };

