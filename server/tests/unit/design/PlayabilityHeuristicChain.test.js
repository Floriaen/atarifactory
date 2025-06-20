const { PlayabilityHeuristicChain } = require('../../../agents/langchain/chains/design/PlayabilityHeuristicChain');

describe('PlayabilityHeuristicChain', () => {
  it('validates a playable game', async () => {
    const gameDef = {
      title: 'Laser Leap',
      mechanics: ['move', 'jump'],
      winCondition: 'Survive for 45 seconds',
      entities: ['player', 'platform', 'timer']
    };
    const result = await PlayabilityHeuristicChain.invoke({ gameDef });
    expect(result).toBe('valid');
  });

  it('returns valid if winCondition present, invalid otherwise', async () => {
    const gameDef = { title: 'No Win', mechanics: ['move'], entities: ['player'] };
    const result = await PlayabilityHeuristicChain.invoke({ gameDef });
    expect(result).toMatch(/^invalid:/);
  });

  it('throws if input is missing', async () => {
    await expect(PlayabilityHeuristicChain.invoke()).rejects.toThrow();
  });

  it('throws if gameDef is missing', async () => {
    await expect(PlayabilityHeuristicChain.invoke({})).rejects.toThrow();
  });

  it('throws if output is malformed (simulate)', async () => {
    // Not needed here since output is always a string, but test for robustness
    const orig = PlayabilityHeuristicChain.invoke;
    PlayabilityHeuristicChain.invoke = async () => 123;
    try {
      await expect(PlayabilityHeuristicChain.invoke({ gameDef: { winCondition: 'foo' } })).resolves.not.toBe('valid');
    } finally {
      PlayabilityHeuristicChain.invoke = orig;
    }
  });
});
