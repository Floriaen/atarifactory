const { createWinConditionBuilderChain } = require('../../../agents/langchain/chains/design/WinConditionBuilderChain');

describe('WinConditionBuilderChain', () => {
  it('builds win condition', async () => {
    const mockLLM = { call: async () => ({ winCondition: 'Mock win condition.' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    const input = { mechanics: ['move', 'jump', 'avoid'] };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('winCondition');
    expect(typeof result.winCondition).toBe('string');
  });

  it('throws if input is missing', async () => {
    const mockLLM = { call: async () => ({ winCondition: 'Mock win condition.' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({ mechanics: ['foo'] })).rejects.toThrow('Output missing required winCondition string');
  });

  it('throws if mechanics is missing', async () => {
    const mockLLM = { call: async () => ({ winCondition: 'Mock win condition.' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = { call: async () => ({ winCondition: 'Mock win condition.' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const mockLLM = { call: async () => ({ winCondition: 'Mock win condition.' }) };
    const chain = createWinConditionBuilderChain(mockLLM);
    const orig = chain.invoke;
    chain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await chain.invoke({ mechanics: ['foo'] });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      chain.invoke = orig;
      WinConditionBuilderChain.invoke = orig;
    }
  });
});
