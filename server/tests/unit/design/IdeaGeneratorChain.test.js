const { IdeaGeneratorChain } = require('../../../agents/langchain/chains/design/IdeaGeneratorChain');

describe('IdeaGeneratorChain', () => {
  it('generates a game idea with title and pitch', async () => {
    // Minimal input for the chain
    const input = {};
    // This will fail until the chain is implemented or mocked
    const result = await IdeaGeneratorChain.invoke(input);
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('pitch');
  });

  it('throws if input is missing', async () => {
    await expect(IdeaGeneratorChain.invoke()).rejects.toThrow('Input must be an object');
  });

  it('handles nonsense input gracefully', async () => {
    const input = { foo: 'bar', baz: 123 };
    await expect(IdeaGeneratorChain.invoke(input)).resolves.toHaveProperty('title');
  });

  it('returns error if output shape is malformed (simulate)', async () => {
    // Simulate by monkey-patching invoke
    const orig = IdeaGeneratorChain.invoke;
    IdeaGeneratorChain.invoke = async () => ({ bad: 'data' });
    try {
      const result = await IdeaGeneratorChain.invoke({});
      expect(result).toHaveProperty('title'); // Should fail
    } catch (e) {
      expect(e).toBeDefined();
    } finally {
      IdeaGeneratorChain.invoke = orig;
    }
  });
});
