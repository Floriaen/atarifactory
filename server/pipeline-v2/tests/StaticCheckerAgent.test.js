const StaticCheckerAgent = require('../agents/StaticCheckerAgent');

describe('StaticCheckerAgent', () => {
  it('should return an array of error strings', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = StaticCheckerAgent(input);
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(typeof result[0]).toBe('string');
    }
  });
}); 