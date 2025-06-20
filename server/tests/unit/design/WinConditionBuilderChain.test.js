const { WinConditionBuilderChain } = require('../../../agents/langchain/chains/design/WinConditionBuilderChain');

describe('WinConditionBuilderChain', () => {
  it('builds a win condition from mechanics and loop', async () => {
    const input = { mechanics: ['move', 'jump', 'avoid'], loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await WinConditionBuilderChain.invoke(input);
    expect(result).toHaveProperty('winCondition');
    expect(typeof result.winCondition).toBe('string');
  });
});
