// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StepFixerAgent = require('../agents/StepFixerAgent');

describe('StepFixerAgent', () => {
  it('should return a string (corrected stepCode)', async () => {
    const input = {
      currentCode: 'function update() {}',
      step: { id: 2, label: 'Add player' },
      errorList: ['ReferenceError']
    };
    const result = await StepFixerAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 