// Integration test for GameDesignAgent using real OpenAI
const OpenAI = require('openai');
const SmartOpenAI = require('../../../utils/SmartOpenAI');
const GameDesignAgent = require('../../../agents/GameDesignAgent');
const { createSharedState } = require('../../../types/SharedState');

describe('GameDesignAgent Integration', () => {
  const name = 'Test Game';
  const description = 'A test game description.';
  const traceId = 'real-openai-test';

  it('should return a valid game design from real OpenAI', async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    const result = await GameDesignAgent(sharedState, { logger: console, traceId, llmClient });
    expect(typeof result).toBe('object');
    expect(result).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        description: expect.any(String),
        mechanics: expect.any(Array),
        winCondition: expect.any(String),
        entities: expect.any(Array)
      })
    );
  });
});
