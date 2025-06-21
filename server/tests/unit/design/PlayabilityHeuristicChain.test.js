const { createPlayabilityHeuristicChain } = require('../../../agents/langchain/chains/design/PlayabilityHeuristicChain');

describe('PlayabilityHeuristicChain', () => {
  it('returns valid for win condition', async () => {
    const mockLLM = { call: async () => 'valid' };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { winCondition: 'Survive' } };
    const result = await chain.invoke(input);
    expect(result).toBe('valid');
  });

  it('returns invalid for missing win condition', async () => {
    const mockLLM = { call: async () => 'invalid: missing win condition' };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { foo: 'bar' } };
    const result = await chain.invoke(input);
    expect(result).toBe('invalid: missing win condition');
  });

  it('throws if input is missing', async () => {
    const mockLLM = { call: async () => 'valid' };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if gameDef is missing', async () => {
    const mockLLM = { call: async () => 'valid' };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('Output missing required playability string');
  });

  it('throws if output is malformed (simulate)', async () => {
    const mockLLM = { call: async () => 123 };
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'foo' } })).rejects.toThrow('Output missing required playability string');
    const orig = PlayabilityHeuristicChain.invoke;
    PlayabilityHeuristicChain.invoke = async () => 123;
    try {
      await expect(PlayabilityHeuristicChain.invoke({ gameDef: { winCondition: 'foo' } })).resolves.not.toBe('valid');
    } finally {
      PlayabilityHeuristicChain.invoke = orig;
    }
  });
});
