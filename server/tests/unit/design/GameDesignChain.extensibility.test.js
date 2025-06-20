const { createGameDesignChain } = require('../../../agents/langchain/chains/design/GameDesignChain');

describe('GameDesignChain extensibility', () => {
  it('allows replacing a chain and reflects new behavior', async () => {
    // Save original chain
    const orig = require('../../../agents/langchain/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke;
    // Replace with a stub
    require('../../../agents/langchain/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke = async () => ({
      title: 'Extensible Game',
      pitch: 'Test pitch',
    });
    const chain = createGameDesignChain();
    const result = await chain.invoke({});
    expect(result.gameDef.title).toBe('Extensible Game');
    // Restore
    require('../../../agents/langchain/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke = orig;
  });

  it('allows adding a new chain step (simulated)', async () => {
    // Simulate adding a new chain step by wrapping the original GameDesignChain
    const origInvoke = createGameDesignChain().invoke;
    const extendedChain = {
      ...createGameDesignChain(),
      invoke: async (input) => {
        const result = await origInvoke(input);
        // Simulate post-processing step
        result.gameDef.extended = true;
        return result;
      },
    };
    const result = await extendedChain.invoke({});
    expect(result.gameDef.extended).toBe(true);
  });
});
