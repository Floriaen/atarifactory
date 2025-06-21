import { createIdeaGeneratorChain } from '../../../agents/langchain/chains/design/IdeaGeneratorChain.mjs';

describe('IdeaGeneratorChain', () => {
  it('generates a game idea', async () => {
    const mockLLM = { call: async () => ({ title: 'Mock Game', pitch: 'A mock pitch.' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    const input = { constraints: 'platformer, lasers' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('pitch');
  });

  it('throws if input is missing', async () => {
    const mockLLM = { call: async () => ({ title: 'Mock', pitch: 'Mock' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    await expect(chain.invoke({ constraints: 'foo' })).rejects.toThrow('Output missing required fields');
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = { call: async () => ({ title: 'Mock Game', pitch: 'A mock pitch.' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    const input = { foo: 'bar', baz: 123 };
    await expect(chain.invoke(input)).resolves.toHaveProperty('title');
  });

  it('returns error if output shape is malformed (simulate)', async () => {
    const mockLLM = { call: async () => ({ bad: 'data' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    try {
      const result = await chain.invoke({});
      expect(result).toHaveProperty('title'); // Should fail
    } catch (e) {
      expect(e).toBeDefined();
    } finally {
      IdeaGeneratorChain.invoke = orig;
    }
  });
});
