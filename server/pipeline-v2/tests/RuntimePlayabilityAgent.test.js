const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');

describe('RuntimePlayabilityAgent', () => {
  it('should return an object with playability booleans', async () => {
    const input = { code: 'function update() {}' };
    const result = await RuntimePlayabilityAgent(input);
    expect(typeof result).toBe('object');
    expect(typeof result.canvasActive).toBe('boolean');
    expect(typeof result.inputResponsive).toBe('boolean');
    expect(typeof result.playerMoved).toBe('boolean');
    expect(typeof result.winConditionReachable).toBe('boolean');
  });
}); 