// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

const StepBuilderAgent = require('../agents/StepBuilderAgent');

describe('StepBuilderAgent', () => {
  it('should return a string (code block) for the step', async () => {
    const input = {
      currentCode: '// code so far',
      plan: [
        { id: 1, label: 'Setup' },
        { id: 2, label: 'Add player' }
      ],
      step: { id: 2, label: 'Add player' }
    };
    const result = await StepBuilderAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 