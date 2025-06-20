const { MechanicExtractorChain } = require('../../../agents/langchain/chains/design/MechanicExtractorChain');

describe('MechanicExtractorChain', () => {
  it('extracts mechanics from gameplay loop', async () => {
    const input = { title: 'Laser Leap', loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await MechanicExtractorChain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
  });

  it('throws if input is missing', async () => {
    await expect(MechanicExtractorChain.invoke()).rejects.toThrow();
  });

  it('throws if loop is missing', async () => {
    await expect(MechanicExtractorChain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    await expect(MechanicExtractorChain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const orig = MechanicExtractorChain.invoke;
    MechanicExtractorChain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await MechanicExtractorChain.invoke({ loop: 'foo' });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      MechanicExtractorChain.invoke = orig;
    }
  });
});
