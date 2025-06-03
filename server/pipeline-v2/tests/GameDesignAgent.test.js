// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const GameDesignAgent = require('../agents/GameDesignAgent');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
describe('GameDesignAgent', () => {
  it('should return an object with the correct keys (MockSmartOpenAI)', async () => {
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
  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid game design from real OpenAI', async () => {
    const input = { title: 'Test Game' };
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const llmClient = new SmartOpenAI(openai);
    const result = await GameDesignAgent(input, { logger, traceId: 'real-openai-test', llmClient });
    expect(typeof result).toBe('object');
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