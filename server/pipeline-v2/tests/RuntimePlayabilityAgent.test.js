// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');

describe('RuntimePlayabilityAgent', () => {
  it('should return an object with playability booleans', async () => {
    const input = { code: 'function update() {}' };
    const result = await RuntimePlayabilityAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.canvasActive).toBe('boolean');
    expect(typeof result.inputResponsive).toBe('boolean');
    expect(typeof result.playerMoved).toBe('boolean');
    expect(typeof result.winConditionReachable).toBe('boolean');
  });
}); 