// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StepFixerAgent = require('../agents/StepFixerAgent');
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
describe('StepFixerAgent', () => {
  it('should return a string (corrected stepCode) (MockOpenAI)', async () => {
    const input = {
      currentCode: 'function update() {}',
      step: { id: 2, label: 'Add player' },
      errorList: ['ReferenceError']
    };
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('StepFixerAgent');
    const result = await StepFixerAgent(input, { logger, traceId: 'mock-test', llmClient: mockOpenAI });
    expect(typeof result).toBe('string');
  });
  (useRealLLM ? it : it.skip)('should return a corrected stepCode from real OpenAI', async () => {
    const input = {
      currentCode: 'function update() {}',
      step: { id: 2, label: 'Add player' },
      errorList: ['ReferenceError']
    };
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await StepFixerAgent(input, { logger, traceId: 'real-openai-test', llmClient });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
  test('StepFixerAgent strips markdown code block markers from LLM output', async () => {
    const mockLLM = {
      chatCompletion: async () => '```js\nconsole.log("fixed");\n```'
    };
    const result = await StepFixerAgent({ currentCode: '', step: { id: 1, label: 'Test' }, errorList: [] }, { logger: console, traceId: 'test', llmClient: mockLLM });
    expect(result).toBe('console.log("fixed");');
  });
}); 