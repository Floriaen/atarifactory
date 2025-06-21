const { createLoopClarifierChain } = require('../../../agents/chains/design/LoopClarifierChain');

describe('LoopClarifierChain', () => {
  it('clarifies main loop', async () => {
    const mockLLM = { call: async () => ({ loop: 'Mock loop.' }) };
    const chain = createLoopClarifierChain(mockLLM);
    const input = { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });

  it('throws if input is missing', async () => {
    const mockLLM = { call: async () => ({ loop: 'Mock loop.' }) };
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if title or pitch missing', async () => {
    const mockLLM = { call: async () => ({ loop: 'Mock loop.' }) };
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ pitch: 'foo' })).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('Output missing required loop string');
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = { call: async () => ({ loop: 'Mock loop.' }) };
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const mockLLM = { call: async () => ({ bad: 'data' }) };
    const chain = createLoopClarifierChain(mockLLM);
    try {
      const result = await LoopClarifierChain.invoke({ title: 'Laser Leap', pitch: 'desc' });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      LoopClarifierChain.invoke = orig;
    }
  });
});
