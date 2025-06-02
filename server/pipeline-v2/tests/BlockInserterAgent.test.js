const BlockInserterAgent = require('../agents/BlockInserterAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('BlockInserterAgent', () => {
  it('should return a string (new currentCode) after insertion/merge', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = BlockInserterAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 