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
    const result = await StepBuilderAgent(input);
    expect(typeof result).toBe('string');
  });
}); 