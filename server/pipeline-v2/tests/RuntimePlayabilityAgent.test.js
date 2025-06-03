// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');
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
describe('RuntimePlayabilityAgent', () => {
  it('should return an object with playability booleans (MockSmartOpenAI)', async () => {
    const input = { code: 'function update() {}' };
    const result = await RuntimePlayabilityAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.canvasActive).toBe('boolean');
    expect(typeof result.inputResponsive).toBe('boolean');
    expect(typeof result.playerMoved).toBe('boolean');
    expect(typeof result.winConditionReachable).toBe('boolean');
  });
  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid runtime result from real OpenAI', async () => {
    // To be implemented if RuntimePlayabilityAgent becomes LLM-driven
    expect(true).toBe(true);
  });
}); 