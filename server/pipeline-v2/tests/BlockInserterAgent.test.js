// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const BlockInserterAgent = require('../agents/BlockInserterAgent');

describe('BlockInserterAgent', () => {
  it('should return a string (new currentCode) after insertion/merge', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = BlockInserterAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 