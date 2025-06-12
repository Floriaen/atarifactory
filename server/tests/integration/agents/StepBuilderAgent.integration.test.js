// Integration test for StepBuilderAgent using real OpenAI
const OpenAI = require('openai');
const SmartOpenAI = require('../../../utils/SmartOpenAI');
const StepBuilderAgent = require('../../../agents/StepBuilderAgent');
const { createSharedState } = require('../../../types/SharedState');

jest.setTimeout(20000);

describe('StepBuilderAgent Integration', () => {
  const traceId = 'real-openai-test';

  it('should return a code block from real OpenAI', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = '// code so far';
    sharedState.plan = [
      { id: 1, label: 'Setup' },
      { id: 2, label: 'Add player' }
    ];
    sharedState.step = { id: 2, label: 'Add player' };

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await StepBuilderAgent(sharedState, { logger: console, traceId, llmClient });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
});
