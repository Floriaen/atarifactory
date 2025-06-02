const GameDesignAgent = require('../agents/GameDesignAgent');

describe('GameDesignAgent', () => {
  it('should return an object with the correct keys', async () => {
    const input = { title: 'Test Game' };
    const result = await GameDesignAgent(input);
    expect(typeof result).toBe('object');
    // Structure check (keys)
    expect(result).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
        mechanics: expect.any(Array),
        winCondition: expect.any(String),
        entities: expect.any(Array)
      })
    );
  });
}); 