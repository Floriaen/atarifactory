const BlockInserterAgent = require('../agents/BlockInserterAgent');

describe('BlockInserterAgent', () => {
  it('should return a string (new currentCode) after insertion/merge', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = BlockInserterAgent(input);
    expect(typeof result).toBe('string');
  });
}); 