const { createMechanicExtractorChain } = require('../../../agents/chains/design/MechanicExtractorChain');

describe('MechanicExtractorChain', () => {
  it('extracts mechanics', async () => {
    const mockLLM = { call: async () => ({ mechanics: ['mock'] }) };
    const chain = createMechanicExtractorChain(mockLLM);
    const input = { loop: 'Player jumps between platforms and dodges lasers.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
  });

  it('throws if input is missing', async () => {
    const mockLLM = { call: async () => ({ mechanics: ['mock'] }) };
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({ loop: 'foo' })).rejects.toThrow('Output missing required mechanics array');
  });

  it('throws if loop is missing', async () => {
    const mockLLM = { call: async () => ({ mechanics: ['mock'] }) };
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = { call: async () => ({ mechanics: ['mock'] }) };
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const mockLLM = { call: async () => ({ bad: 'data' }) };
    const chain = createMechanicExtractorChain(mockLLM);
    try {
      const result = await chain.invoke({ loop: 'foo' });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      // No need to restore original invoke method, as we're using a new chain instance
      MechanicExtractorChain.invoke = orig;
    }
  });
});
