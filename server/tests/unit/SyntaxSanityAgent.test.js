// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const SyntaxSanityAgent = require('../agents/SyntaxSanityAgent');
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
describe('SyntaxSanityAgent', () => {
  it('should return an object with a boolean valid property (MockOpenAI)', () => {
    const input = { code: 'function update() {}' };
    const result = SyntaxSanityAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.valid).toBe('boolean');
    if (result.error !== undefined) {
      expect(typeof result.error).toBe('string');
    }
  });

  it('should return valid: true for syntactically correct code', () => {
    const input = { code: 'function foo() { return 42; }' };
    const result = SyntaxSanityAgent(input, { logger, traceId: 'valid' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid: false and an error for syntax errors', () => {
    const input = { code: 'function () {' };
    const result = SyntaxSanityAgent(input, { logger, traceId: 'syntax' });
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('should return valid: true for code with runtime errors (only syntax checked)', () => {
    const input = { code: 'throw new Error("fail at runtime");' };
    const result = SyntaxSanityAgent(input, { logger, traceId: 'runtime' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Placeholder for real LLM test
  // (useRealLLM ? it : it.skip)('should return a valid syntax check from real OpenAI', async () => {
  //   // To be implemented if SyntaxSanityAgent becomes LLM-driven
  //   expect(true).toBe(true);
  // });
}); 