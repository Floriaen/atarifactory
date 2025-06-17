const OpenAI = require('openai'); // or your actual OpenAI client import
const ContextStepBuilderAgent = require('../../../agents/ContextStepBuilderAgent');
const { createSharedState } = require('../../../types/SharedState');
const SmartOpenAI = require('../../../utils/SmartOpenAI');

// This integration test is meant to be run with a real LLM client (set up your API key as needed)
// For deterministic tests, use a realistic mock

describe('ContextStepBuilderAgent Integration', () => {
  const traceId = 'real-openai-test';
  it('should build code incrementally with a real LLM', async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const sharedState = createSharedState();
    sharedState.gameSource = 'function draw() { /* ... */ }';
    sharedState.plan = [
      { id: 1, description: 'Setup' },
      { id: 2, description: 'Add score' }
    ];
    sharedState.step = { id: 2, description: 'Add score' };
    const result = await ContextStepBuilderAgent(sharedState, { logger: console, traceId, llmClient });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/function draw\(\)/);
  });
});

