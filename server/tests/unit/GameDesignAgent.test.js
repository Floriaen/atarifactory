// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const GameDesignAgent = require('../../agents/GameDesignAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();

const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('GameDesignAgent', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  };
  const traceId = 'test-trace';
  const name = 'Test Game';
  const description = 'desc';
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
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    const result = await GameDesignAgent(sharedState, { logger: logger, traceId: 'test-trace', llmClient: mockOpenAI });
    expect(typeof result).toBe('object');
    // Structure check (keys)
    expect(result).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        description: expect.any(String),
        mechanics: expect.any(Array),
        winCondition: expect.any(String),
        entities: expect.any(Array)
      })
    );
  });

  it('logs the call with correct arguments', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({
      name: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e']
    }) };
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    await GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(mockLogger.info).toHaveBeenCalledWith('GameDesignAgent called', { traceId, input: { name, description } });
  });

  it('throws and logs error if llmClient is missing', async () => {
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    sharedState.description = 'desc';
    await expect(GameDesignAgent(sharedState, { logger: mockLogger, traceId })).rejects.toThrow('GameDesignAgent: llmClient is required but was not provided');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'GameDesignAgent error',
      expect.objectContaining({
        traceId,
        error: expect.any(Error),
        input: { name, description }
      })
    );
  });

  it('loads prompt and calls llmClient.chatCompletion with correct prompt', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({
      name: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e']
    }) };
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    sharedState.description = 'desc';
    await GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(fs.readFileSync).toHaveBeenCalledWith(promptPath, 'utf8');
    expect(llmClient.chatCompletion).toHaveBeenCalledWith({
      prompt: expect.stringContaining(promptTemplate),
      outputType: 'json-object'
    });
  });

  it('logs and returns parsed output if contract matches', async () => {
    const parsed = { name: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e'] };
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue(parsed) };
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    sharedState.description = 'desc';
    const result = await GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(mockLogger.info).toHaveBeenCalledWith('GameDesignAgent LLM parsed output', { traceId, parsed });
    expect(result).toEqual(parsed);
  });

  it('throws and logs error if name and description are missing in sharedState', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({}) };
    const sharedState = createSharedState(); // no title, no name, no description
    await expect(GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient })).rejects.toThrow('GameDesignAgent: name and description are required in sharedState');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'GameDesignAgent error',
      expect.objectContaining({
        traceId,
        error: expect.any(Error),
        input: { name: '', description: '' }
      })
    );
  });

  it('logs and throws on any other error', async () => {
    const llmClient = { chatCompletion: jest.fn(() => { throw new Error('llm error'); }) };
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    sharedState.description = 'desc';
    await expect(GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient })).rejects.toThrow('llm error');
    expect(mockLogger.error).toHaveBeenCalledWith('GameDesignAgent error', expect.objectContaining({ traceId, error: expect.any(Error), input: { name, description } }));
  });

  it('updates sharedState with game definition', async () => {
    const sharedState = createSharedState();
    sharedState.name = name;
    sharedState.description = description;
    sharedState.description = 'desc';
    const parsed = { name: 'Test Game', description: 'desc', mechanics: ['a'], winCondition: 'win', entities: ['e'] };
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue(parsed) };
    
    await GameDesignAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    
    expect(sharedState.gameDef).toEqual(parsed);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
}); 