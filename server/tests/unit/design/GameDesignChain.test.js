const { GameDesignChain, createGameDesignChain } = require('../../../agents/langchain/chains/design/GameDesignChain');

describe('GameDesignChain (integration)', () => {
  it('produces a valid, playable game definition from minimal input', async () => {
    const input = {};
    const result = await GameDesignChain.invoke(input);
    expect(result).toHaveProperty('gameDef');
    expect(result.gameDef).toHaveProperty('title');
    expect(result.gameDef).toHaveProperty('mechanics');
    expect(result.gameDef).toHaveProperty('winCondition');
    expect(result.gameDef).toHaveProperty('entities');
    expect(result.gameDef).toHaveProperty('description');
    // Playability check (if present)
    if (result.gameDef.playability) {
      expect(result.gameDef.playability).toBe('valid');
    }
  });
});

describe('GameDesignChain exports', () => {
  it('should provide a createGameDesignChain factory that returns the chain', () => {
    const chain = createGameDesignChain();
    expect(chain).toBe(GameDesignChain);
    expect(typeof chain.invoke).toBe('function');
  });
});
