const PlayabilityValidatorAgent = require('../../agents/PlayabilityValidatorAgent');

describe('PlayabilityValidatorAgent', () => {
  const logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() };
  const traceId = 'test-trace';

  it('returns isPlayable: true for winnable design', async () => {
    const sharedState = {
      gameDef: {
        name: 'Test Game',
        description: 'desc',
        mechanics: ['move', 'collect'],
        winCondition: 'Collect all coins',
        entities: ['player', 'coin']
      }
    };
    const result = await PlayabilityValidatorAgent(sharedState, { logger, traceId });
    expect(result.isPlayable).toBe(true);
    expect(result.suggestion).toBeUndefined();
  });

  it('returns isPlayable: false and suggestion for unwinnable design', async () => {
    const sharedState = {
      gameDef: {
        name: 'Test Game',
        description: 'desc',
        mechanics: ['move'],
        winCondition: 'Collect all coins',
        entities: ['player', 'coin']
      }
    };
    const result = await PlayabilityValidatorAgent(sharedState, { logger, traceId });
    expect(result.isPlayable).toBe(false);
    expect(result.suggestion).toBeDefined();
    expect(typeof result.suggestion).toBe('string');
    expect(result.suggestion.length).toBeGreaterThan(0);
  });

  it('returns isPlayable: false and generic suggestion if no LLM fallback', async () => {
    const sharedState = {
      gameDef: {
        name: 'Test Game',
        description: 'desc',
        mechanics: [],
        winCondition: 'Reach the exit',
        entities: ['player']
      }
    };
    // No llmClient, ambiguous false
    const result = await PlayabilityValidatorAgent(sharedState, { logger, traceId });
    expect(result.isPlayable).toBe(false);
    expect(result.suggestion).toBeDefined();
    expect(typeof result.suggestion).toBe('string');
    expect(result.suggestion.length).toBeGreaterThan(0);
  });
});
