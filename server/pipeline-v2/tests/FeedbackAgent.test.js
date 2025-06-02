const FeedbackAgent = require('../agents/FeedbackAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('FeedbackAgent', () => {
  it('should return an object with retryTarget and suggestion', () => {
    const input = { runtimeLogs: {}, stepId: 1 };
    const result = FeedbackAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(['fixer', 'planner']).toContain(result.retryTarget);
    expect(typeof result.suggestion).toBe('string');
  });
}); 