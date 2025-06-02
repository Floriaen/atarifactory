// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const FeedbackAgent = require('../agents/FeedbackAgent');

describe('FeedbackAgent', () => {
  it('should return an object with retryTarget and suggestion', () => {
    const input = { runtimeLogs: {}, stepId: 1 };
    const result = FeedbackAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(['fixer', 'planner']).toContain(result.retryTarget);
    expect(typeof result.suggestion).toBe('string');
  });
}); 