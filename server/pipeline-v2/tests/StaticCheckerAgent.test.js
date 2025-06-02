// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StaticCheckerAgent = require('../agents/StaticCheckerAgent');

describe('StaticCheckerAgent', () => {
  it('should return an array of error strings', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = StaticCheckerAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(typeof result[0]).toBe('string');
    }
  });
}); 