// Integration test for ContextStepFixerAgent (pipeline-v3)
// Requires OPENAI_API_KEY and real OpenAI client

const OpenAI = require('openai');
const ContextStepFixerAgent = require('../../../agents/ContextStepFixerAgent');
const { createSharedState } = require('../../../types/SharedState');
const SmartOpenAI = require('../../../utils/SmartOpenAI');

describe('ContextStepFixerAgent Integration', () => {
  it('fixes code based on error list using real OpenAI', async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const sharedState = createSharedState();
    sharedState.gameSource = 'function update() { player.x += 5 }'; // missing semicolon
    sharedState.plan = [
      { id: 1, description: 'Setup' },
      { id: 2, description: 'Add score' }
    ];
    sharedState.step = { id: 2, description: 'Add score' };
    sharedState.errors = [
      { line: 1, message: 'Missing semicolon', ruleId: 'semi' }
    ];

    const result = await ContextStepFixerAgent(sharedState, {
      logger: undefined,
      traceId: 'integration-test',
      llmClient
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('function update()');
    expect(sharedState.gameSource).toBe(result);
    expect(sharedState.metadata).toBeDefined();
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
});
