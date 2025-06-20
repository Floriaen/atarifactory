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
});
