// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const SyntaxSanityAgent = require('../agents/SyntaxSanityAgent');

describe('SyntaxSanityAgent', () => {
  it('should return an object with a boolean valid property', () => {
    const input = { code: 'function update() {}' };
    const result = SyntaxSanityAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.valid).toBe('boolean');
    if (result.error !== undefined) {
      expect(typeof result.error).toBe('string');
    }
  });
}); 