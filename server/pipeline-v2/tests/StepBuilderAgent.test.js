const StepBuilderAgent = require('../agents/StepBuilderAgent');
const mockLogger = { info: () => {}, error: () => {} };

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
    const result = await StepBuilderAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 