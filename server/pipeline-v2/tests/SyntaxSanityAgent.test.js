const SyntaxSanityAgent = require('../agents/SyntaxSanityAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('SyntaxSanityAgent', () => {
  it('should return an object with a boolean valid property', () => {
    const input = { code: 'function update() {}' };
    const result = SyntaxSanityAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('object');
    expect(typeof result.valid).toBe('boolean');
    if (result.error !== undefined) {
      expect(typeof result.error).toBe('string');
    }
  });
}); 