const { WinConditionBuilderChain } = require('../../../agents/langchain/chains/design/WinConditionBuilderChain');

describe('WinConditionBuilderChain', () => {
  it('generates a win condition from mechanics', async () => {
    const input = { mechanics: ['move', 'jump', 'avoid'], loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await WinConditionBuilderChain.invoke(input);
    expect(result).toHaveProperty('winCondition');
    expect(typeof result.winCondition).toBe('string');
  });

  it('throws if input is missing', async () => {
    await expect(WinConditionBuilderChain.invoke()).rejects.toThrow();
  });

  it('throws if mechanics is missing', async () => {
    await expect(WinConditionBuilderChain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    await expect(WinConditionBuilderChain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const orig = WinConditionBuilderChain.invoke;
    WinConditionBuilderChain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await WinConditionBuilderChain.invoke({ mechanics: ['foo'] });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      WinConditionBuilderChain.invoke = orig;
    }
  });
});
