// Minimal scaffold for TDD
const FinalAssemblerChain = {
  async invoke(input) {
    if (!input || typeof input !== 'object' || !input.title || !input.pitch || !input.mechanics || !input.winCondition || !input.entities) {
      throw new Error('Input must be an object with title, pitch, mechanics, winCondition, and entities');
    }
    const gameDef = {
      name: input.title || 'Laser Leap', // alias for title for test compatibility
      title: input.title || 'Laser Leap',
      description: input.pitch || 'Dodge lasers and leap between platforms.',
      mechanics: input.mechanics || ['move', 'jump', 'avoid'],
      winCondition: input.winCondition || 'Survive for 45 seconds',
      entities: input.entities || ['player', 'platform', 'laser', 'timer']
    };
    if (!gameDef.title || !gameDef.description || !Array.isArray(gameDef.mechanics) || !gameDef.winCondition || !Array.isArray(gameDef.entities)) {
      throw new Error('Output missing required gameDef fields');
    }
    return { gameDef };
  }
};
module.exports = { FinalAssemblerChain };

