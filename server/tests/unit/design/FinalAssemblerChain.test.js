const { FinalAssemblerChain } = require('../../../agents/langchain/chains/design/FinalAssemblerChain');

describe('FinalAssemblerChain', () => {
  it('assembles the final game definition object', async () => {
    const input = {
      title: 'Laser Leap',
      pitch: 'Dodge lasers and leap between platforms.',
      loop: 'Player jumps between platforms and dodges lasers.',
      mechanics: ['move', 'jump', 'avoid'],
      winCondition: 'Survive for 45 seconds',
      entities: ['player', 'platform', 'laser', 'timer']
    };
    // This will fail until the chain is implemented or mocked
    const result = await FinalAssemblerChain.invoke(input);
    expect(result).toHaveProperty('gameDef');
    expect(result.gameDef).toMatchObject({
      title: input.title,
      description: input.pitch,
      mechanics: input.mechanics,
      winCondition: input.winCondition,
      entities: input.entities
    });
  });
});
