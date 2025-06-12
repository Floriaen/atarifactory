// Integration test for PlannerAgent using real OpenAI
const OpenAI = require('openai');
const SmartOpenAI = require('../../../utils/SmartOpenAI');
const PlannerAgent = require('../../../agents/PlannerAgent');
const { createSharedState } = require('../../../types/SharedState');

jest.setTimeout(20000);

describe('PlannerAgent Integration', () => {
  const gameDef = {
    title: 'Coin Collector',
    description: 'Collect all coins while avoiding spikes.',
    mechanics: ['move left/right', 'jump', 'collect', 'avoid'],
    winCondition: 'Collect all 10 coins',
    entities: ['player', 'coin', 'spike']
  };
  const traceId = 'real-openai-test';

  it('should return a valid plan from real OpenAI', async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const sharedState = createSharedState();
    sharedState.gameDef = gameDef;
    const result = await PlannerAgent(sharedState, { logger: console, traceId, llmClient });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('label');
  });
});
