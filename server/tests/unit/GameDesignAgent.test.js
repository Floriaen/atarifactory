// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const GameDesignAgent = require('../../agents/GameDesignAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../../utils/SmartOpenAI');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('GameDesignAgent', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  };
  const traceId = 'test-trace';
  const input = { title: 'Test Game' };
  const promptTemplate = 'Design a game based on the following title:';
  const promptPath = path.join(__dirname, '../../agents/prompts/GameDesignAgent.prompt.md');

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath === promptPath) return promptTemplate;
      throw new Error('File not found');
    });
  });

  it('should return an object with the correct keys (MockOpenAI)', async () => {
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('GameDesignAgent');
    const result = await GameDesignAgent(input, { logger: logger, traceId: 'test-trace', llmClient: mockOpenAI });
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

  it('logs the call with correct arguments', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({
      title: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e']
    }) };
    await GameDesignAgent(input, { logger: mockLogger, traceId, llmClient });
    expect(mockLogger.info).toHaveBeenCalledWith('GameDesignAgent called', { traceId, input });
  });

  it('throws and logs error if llmClient is missing', async () => {
    await expect(GameDesignAgent(input, { logger: mockLogger, traceId })).rejects.toThrow('GameDesignAgent: llmClient is required but was not provided');
    expect(mockLogger.error).toHaveBeenCalledWith('GameDesignAgent: llmClient is required but was not provided', { traceId });
  });

  it('loads prompt and calls llmClient.chatCompletion with correct prompt', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({
      title: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e']
    }) };
    await GameDesignAgent(input, { logger: mockLogger, traceId, llmClient });
    expect(fs.readFileSync).toHaveBeenCalledWith(promptPath, 'utf8');
    expect(llmClient.chatCompletion).toHaveBeenCalledWith({
      prompt: expect.stringContaining(promptTemplate),
      outputType: 'json-object'
    });
  });

  it('logs and returns parsed output if contract matches', async () => {
    const parsed = { title: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e'] };
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue(parsed) };
    const result = await GameDesignAgent(input, { logger: mockLogger, traceId, llmClient });
    expect(mockLogger.info).toHaveBeenCalledWith('GameDesignAgent LLM parsed output', { traceId, parsed });
    expect(result).toEqual(parsed);
  });

  it('throws and logs error if LLM output is missing required fields', async () => {
    const parsed = { title: 'Test Game', description: 'desc', mechanics: 'not-an-array', winCondition: 'win', entities: ['e'] };
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue(parsed) };
    await expect(GameDesignAgent(input, { logger: mockLogger, traceId, llmClient })).rejects.toThrow('GameDesignAgent: LLM output missing required fields');
    expect(mockLogger.error).toHaveBeenCalledWith('GameDesignAgent LLM output missing required fields', { traceId, parsed });
  });

  it('logs and throws on any other error', async () => {
    const llmClient = { chatCompletion: jest.fn(() => { throw new Error('llm error'); }) };
    await expect(GameDesignAgent(input, { logger: mockLogger, traceId, llmClient })).rejects.toThrow('llm error');
    expect(mockLogger.error).toHaveBeenCalledWith('GameDesignAgent error', expect.objectContaining({ traceId, error: expect.any(Error), input }));
  });
}); 