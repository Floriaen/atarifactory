// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StaticCheckerAgent = require('../../agents/StaticCheckerAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../../utils/SmartOpenAI');
const { createSharedState } = require('../../types/SharedState');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
describe('StaticCheckerAgent', () => {
  it('should return an array of error strings (MockOpenAI)', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = '// new logic';
    const result = StaticCheckerAgent(sharedState, { logger: logger, traceId: 'test-trace' });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(typeof result[0]).toBe('string');
    }
  });

  it('should detect duplicate function declarations', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'function update() {}';
    const result = StaticCheckerAgent(sharedState, { logger, traceId: 'dup-fn' });
    expect(result.some(e => e.includes('Duplicate declaration: update'))).toBe(true);
  });

  it('should detect undeclared variables', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'console.log(x);';
    const result = StaticCheckerAgent(sharedState, { logger, traceId: 'undeclared' });
    expect(result.some(e => e.includes('Undeclared variable: x'))).toBe(true);
  });

  it('should detect syntax errors', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'function () {';
    const result = StaticCheckerAgent(sharedState, { logger, traceId: 'syntax' });
    expect(result.some(e => e.includes('Syntax error'))).toBe(true);
  });

  // Placeholder for real LLM test
  // (useRealLLM ? it : it.skip)('should return a valid static check from real OpenAI', async () => {
  //   // To be implemented if StaticCheckerAgent becomes LLM-driven
  //   expect(true).toBe(true);
  // });
}); 