// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

const StepBuilderAgent = require('../agents/StepBuilderAgent');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');

const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();

const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;

describe('StepBuilderAgent', () => {
  it('should return a string (code block) for the step (MockSmartOpenAI)', async () => {
    const input = {
      currentCode: '// code so far',
      plan: [
        { id: 1, label: 'Setup' },
        { id: 2, label: 'Add player' }
      ],
      step: { id: 2, label: 'Add player' }
    };
    const mockSmartOpenAI = new MockSmartOpenAI();
    const result = await StepBuilderAgent(input, { logger, traceId: 'mock-test', llmClient: mockSmartOpenAI });
    expect(typeof result).toBe('string');
  });

  (useRealLLM ? it : it.skip)('should return a code block from real OpenAI', async () => {
    const input = {
      currentCode: '// code so far',
      plan: [
        { id: 1, label: 'Setup' },
        { id: 2, label: 'Add player' }
      ],
      step: { id: 2, label: 'Add player' }
    };
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await StepBuilderAgent(input, { logger, traceId: 'real-openai-test', llmClient });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
}); 