const PlannerAgent = require('../agents/PlannerAgent');
const mockLogger = { info: () => {}, error: () => {} };

describe('PlannerAgent', () => {
  it('should return an array of steps with id and label', async () => {
    const mockGameDef = {
      title: 'Test Game',
      description: 'desc',
      mechanics: ['move'],
      winCondition: 'win',
      entities: ['player']
    };
    const result = await PlannerAgent(mockGameDef, { logger: mockLogger, traceId: 'test-trace' });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          label: expect.any(String)
        })
      );
    }
  });
}); 