// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

jest.setTimeout(20000);
const GameDesignAgent = require('../agents/GameDesignAgent');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');

describe('GameDesignAgent', () => {
  it('should return an object with the correct keys', async () => {
    const input = { title: 'Test Game' };
    const mockSmartOpenAI = new MockSmartOpenAI();
    const result = await GameDesignAgent(input, { logger: logger, traceId: 'test-trace', llmClient: mockSmartOpenAI });
    expect(typeof result).toBe('object');
    // Structure check (keys)
    expect(result).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
        mechanics: expect.any(Array),
        winCondition: expect.any(String),
        entities: expect.any(Array)
      })
    );
  });
}); 