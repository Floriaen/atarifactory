const StepFixerAgent = require('../agents/StepFixerAgent');

describe('StepFixerAgent', () => {
  it('should return a string (corrected stepCode)', async () => {
    const input = {
      currentCode: 'function update() {}',
      step: { id: 2, label: 'Add player' },
      errorList: ['ReferenceError']
    };
    const result = await StepFixerAgent(input);
    expect(typeof result).toBe('string');
  });
}); 