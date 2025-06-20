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

  it('flags missing win condition', async () => {
    const gameDef = { title: 'No Win', mechanics: ['move'], entities: ['player'] };
    const result = await PlayabilityHeuristicChain.invoke({ gameDef });
    expect(result).toMatch(/^invalid:/);
  });
});
