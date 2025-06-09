// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const FeedbackAgent = require('../../agents/FeedbackAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
const mockOpenAI = new MockOpenAI();
mockOpenAI.setAgent('FeedbackAgent');
describe('FeedbackAgent', () => {
  it('should return an object with retryTarget and suggestion (MockOpenAI)', async () => {
    const runtimeLogs = { canvasActive: false, inputResponsive: false, playerMoved: false, winConditionReachable: false };
    const stepId = 1;
    const result = await FeedbackAgent({ runtimeLogs, stepId }, { logger, traceId: 'test', llmClient: mockOpenAI });
    expect(result).toHaveProperty('retryTarget');
    expect(result).toHaveProperty('suggestion');
  });
  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid feedback from real OpenAI', async () => {
    // To be implemented if FeedbackAgent becomes LLM-driven
    expect(true).toBe(true);
  });
}); 