require('dotenv').config();
jest.setTimeout(20000);
const PlannerAgent = require('../agents/PlannerAgent');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const SmartOpenAI = require('../utils/SmartOpenAI');

const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();

const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;

describe('PlannerAgent', () => {
  it('should return an array of steps with id and label (MockSmartOpenAI)', async () => {
    const mockGameDef = {
      title: 'Test Game',
      description: 'desc',
      mechanics: ['move'],
      winCondition: 'win',
      entities: ['player']
    };
    const mockSmartOpenAI = new MockSmartOpenAI();
    const prompt = 'You are a game development planner agent. Given a game definition in JSON, create a step-by-step plan to build the game in vanilla JavaScript using the mechanics and entities listed. Each step should be atomic, build on the previous, and cover all core gameplay features.\n\nGame definition:\n' + JSON.stringify(mockGameDef, null, 2) + '\n\nRespond with a JSON array of steps, each with an id and label. Example:\n[\n  { "id": 1, "label": "Setup canvas and loop" },\n  { "id": 2, "label": "Add player and controls" },\n  { "id": 3, "label": "Add coins and scoring" },\n  { "id": 4, "label": "Add spikes and loss condition" },\n  { "id": 5, "label": "Display win/lose text" }\n]\n\nIMPORTANT: Respond with a JSON array ONLY. Do not include any explanation, formatting, or code block. Output only the JSON array.';
    const result = await mockSmartOpenAI.chatCompletion({ prompt, outputType: 'json-array' });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          label: expect.any(String)
        })
      );
    }
  });

  (useRealLLM ? it : it.skip)('should return a valid plan from real OpenAI', async () => {
    const gameDef = {
      title: 'Coin Collector',
      description: 'Collect all coins while avoiding spikes.',
      mechanics: ['move left/right', 'jump', 'collect', 'avoid'],
      winCondition: 'Collect all 10 coins',
      entities: ['player', 'coin', 'spike']
    };
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await PlannerAgent(gameDef, { logger, traceId: 'real-openai-test', llmClient });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('label');
  });
}); 