const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('RuntimePlayabilityAgent', () => {
  it('should return an object with playability booleans', async () => {
    const input = { code: 'function update() {}' };
    const result = await RuntimePlayabilityAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.canvasActive).toBe('boolean');
    expect(typeof result.inputResponsive).toBe('boolean');
    expect(typeof result.playerMoved).toBe('boolean');
    expect(typeof result.winConditionReachable).toBe('boolean');
  });
}); 