// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

const StepBuilderAgent = require('../agents/StepBuilderAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
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
  it('should return a string (code block) for the step (MockOpenAI)', async () => {
    const input = {
      currentCode: '// code so far',
      plan: [
        { id: 1, label: 'Setup' },
        { id: 2, label: 'Add player' }
      ],
      step: { id: 2, label: 'Add player' }
    };
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('StepBuilderAgent');
    const result = await StepBuilderAgent(input, { logger, traceId: 'mock-test', llmClient: mockOpenAI });
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

  test('StepBuilderAgent strips markdown code block markers from LLM output', async () => {
    const mockLLM = {
      chatCompletion: async () => '```js\nconsole.log("hello");\n```'
    };
    const result = await StepBuilderAgent({ currentCode: '', plan: [], step: { id: 1, label: 'Test' } }, { logger: console, traceId: 'test', llmClient: mockLLM });
    expect(result).toBe('console.log("hello");');
  });
}); 