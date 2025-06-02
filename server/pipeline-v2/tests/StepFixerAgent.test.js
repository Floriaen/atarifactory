const StepFixerAgent = require('../agents/StepFixerAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('StepFixerAgent', () => {
  it('should return a string (corrected stepCode)', async () => {
    const input = {
      currentCode: 'function update() {}',
      step: { id: 2, label: 'Add player' },
      errorList: ['ReferenceError']
    };
    const result = await StepFixerAgent(input, { logger: mockLogger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });
}); 