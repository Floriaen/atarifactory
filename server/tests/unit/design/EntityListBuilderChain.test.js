const { EntityListBuilderChain } = require('../../../agents/langchain/chains/design/EntityListBuilderChain');

describe('EntityListBuilderChain', () => {
  it('builds an entity list from mechanics and loop', async () => {
    const input = { mechanics: ['move', 'jump', 'avoid'], loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await EntityListBuilderChain.invoke(input);
    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
  });
});
