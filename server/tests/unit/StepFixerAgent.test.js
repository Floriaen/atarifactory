// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StepFixerAgent = require('../../agents/StepFixerAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');
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
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.step = { id: 2, label: 'Add player' };
    sharedState.errorList = ['ReferenceError'];
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('StepFixerAgent');
    const result = await StepFixerAgent(sharedState, { logger, traceId: 'mock-test', llmClient: mockOpenAI });
    expect(typeof result).toBe('string');
    expect(sharedState.stepCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  (useRealLLM ? it : it.skip)('should return a corrected stepCode from real OpenAI', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.step = { id: 2, label: 'Add player' };
    sharedState.errorList = ['ReferenceError'];
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await StepFixerAgent(sharedState, { logger, traceId: 'real-openai-test', llmClient: openai });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(sharedState.stepCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  test('StepFixerAgent strips markdown code block markers from LLM output', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = '';
    sharedState.step = { id: 1, label: 'Test' };
    sharedState.errorList = [];
    const mockLLM = {
      chatCompletion: async () => '```js\nconsole.log("fixed");\n```'
    };
    const result = await StepFixerAgent(sharedState, { logger: console, traceId: 'test', llmClient: mockLLM });
    expect(result).toBe('console.log("fixed");');
    expect(sharedState.stepCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
}); 