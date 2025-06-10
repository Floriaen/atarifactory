// Integration test for StepFixerAgent using real OpenAI
const OpenAI = require('openai');
const SmartOpenAI = require('../../../utils/SmartOpenAI');
const StepFixerAgent = require('../../../agents/StepFixerAgent');
const { createSharedState } = require('../../../types/SharedState');

describe('StepFixerAgent Integration', () => {
  const traceId = 'real-openai-test';

  it('should return a corrected stepCode from real OpenAI', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.step = { id: 2, label: 'Add player' };
    sharedState.errorList = ['ReferenceError'];
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await StepFixerAgent(sharedState, { logger: console, traceId, llmClient });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(sharedState.stepCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
});
