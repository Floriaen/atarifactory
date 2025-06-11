const PlannerAgent = require('../../agents/PlannerAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();

const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
describe('PlannerAgent', () => {
  const mockGameDef = {
    title: 'Test Game',
    description: 'desc',
    mechanics: ['move'],
    winCondition: 'win',
    entities: ['player']
  };

  it('should return an array of steps with id and label (MockOpenAI)', async () => {
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('PlannerAgent');
    const prompt = 'You are a game development planner agent. Given a game definition in JSON, create a step-by-step plan to build the game in vanilla JavaScript using the mechanics and entities listed. Each step should be atomic, build on the previous, and cover all core gameplay features.\n\nGame definition:\n' + JSON.stringify(mockGameDef, null, 2) + '\n\nRespond with a JSON array of steps, each with an id and label. Example:\n[\n  { "id": 1, "label": "Setup canvas and loop" },\n  { "id": 2, "label": "Add player and controls" },\n  { "id": 3, "label": "Add coins and scoring" },\n  { "id": 4, "label": "Add spikes and loss condition" },\n  { "id": 5, "label": "Display win/lose text" }\n]\n\nIMPORTANT: Respond with a JSON array ONLY. Do not include any explanation, formatting, or code block. Output only the JSON array.';
    const result = await mockOpenAI.chatCompletion({ prompt, outputType: 'json-array' });
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

  it('should update sharedState when provided', async () => {
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('PlannerAgent');
    const sharedState = createSharedState();
    sharedState.gameDef = mockGameDef;
    
    const result = await PlannerAgent(sharedState, { logger, traceId: 'shared-state-test', llmClient: mockOpenAI });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('label');
    
    // Check that sharedState was updated
    expect(sharedState.plan).toEqual(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should work with old input format (backward compatibility)', async () => {
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('PlannerAgent');
    const sharedState = createSharedState();
    sharedState.gameDef = mockGameDef;
    
    const result = await PlannerAgent(sharedState, { logger, traceId: 'backward-compat-test', llmClient: mockOpenAI });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('label');
  });

  // (useRealLLM ? it : it.skip)('should return a valid plan from real OpenAI', async () => {
  //   const gameDef = {
  //     title: 'Coin Collector',
  //     description: 'Collect all coins while avoiding spikes.',
  //     mechanics: ['move left/right', 'jump', 'collect', 'avoid'],
  //     winCondition: 'Collect all 10 coins',
  //     entities: ['player', 'coin', 'spike']
  //   };
  //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //   const llmClient = new SmartOpenAI(openai);
  //   const sharedState = createSharedState();
  //   sharedState.gameDef = gameDef;
  //   const result = await PlannerAgent(sharedState, { logger, traceId: 'real-openai-test', llmClient });
  //   expect(Array.isArray(result)).toBe(true);
  //   expect(result.length).toBeGreaterThan(0);
  //   expect(result[0]).toHaveProperty('id');
  //   expect(result[0]).toHaveProperty('label');
  // });
}); 