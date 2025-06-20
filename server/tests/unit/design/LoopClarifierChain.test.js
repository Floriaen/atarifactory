const { LoopClarifierChain } = require('../../../agents/langchain/chains/design/LoopClarifierChain');

describe('LoopClarifierChain', () => {
  it('generates a gameplay loop description from title/pitch', async () => {
    const input = { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' };
    // This will fail until the chain is implemented or mocked
    const result = await LoopClarifierChain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });

  it('throws if input is missing', async () => {
    await expect(LoopClarifierChain.invoke()).rejects.toThrow();
  });

  it('throws if title or pitch missing', async () => {
    await expect(LoopClarifierChain.invoke({ pitch: 'foo' })).rejects.toThrow();
    await expect(LoopClarifierChain.invoke({ title: 'foo' })).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    await expect(LoopClarifierChain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const orig = LoopClarifierChain.invoke;
    LoopClarifierChain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await LoopClarifierChain.invoke({ title: 'Laser Leap', pitch: 'desc' });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      LoopClarifierChain.invoke = orig;
    }
  });
});
