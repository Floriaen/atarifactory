const { EntityListBuilderChain } = require('../../../agents/langchain/chains/design/EntityListBuilderChain');

describe('EntityListBuilderChain', () => {
  it('extracts entity list from mechanics', async () => {
    const input = { mechanics: ['move', 'jump', 'avoid'], loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await EntityListBuilderChain.invoke(input);
    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
  });

  it('throws if input is missing', async () => {
    await expect(EntityListBuilderChain.invoke()).rejects.toThrow();
  });

  it('throws if mechanics is missing', async () => {
    await expect(EntityListBuilderChain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    await expect(EntityListBuilderChain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const orig = EntityListBuilderChain.invoke;
    EntityListBuilderChain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await EntityListBuilderChain.invoke({ mechanics: ['foo'] });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      EntityListBuilderChain.invoke = orig;
    }
  });
});
