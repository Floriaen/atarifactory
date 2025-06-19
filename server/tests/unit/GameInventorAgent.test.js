const GameInventorAgent = require('../../agents/GameInventorAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');
const fs = require('fs');
const path = require('path');

jest.mock('fs');

describe('GameInventorAgent', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn() };
  const traceId = 'test-trace';
  const promptTemplate = 'You are a creative game inventor.';
  const promptPath = path.join(__dirname, '../../agents/prompts/GameInventorAgent.prompt.md');

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath === promptPath) return promptTemplate;
      throw new Error('File not found');
    });
  });

  it('should return an object with name and description (MockOpenAI)', async () => {
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('GameInventorAgent');
    const sharedState = createSharedState();
    const result = await GameInventorAgent(sharedState, { logger: mockLogger, traceId, llmClient: mockOpenAI });
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('description');
    expect(typeof result.name).toBe('string');
    expect(typeof result.description).toBe('string');
  });

  it('logs the call with correct arguments', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({ name: 'Test Name', description: 'desc' }) };
    const sharedState = createSharedState();
    await GameInventorAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(mockLogger.info).toHaveBeenCalledWith('GameInventorAgent called', { traceId });
  });

  it('throws and logs error if llmClient is missing', async () => {
    const sharedState = createSharedState();
    await expect(GameInventorAgent(sharedState, { logger: mockLogger, traceId })).rejects.toThrow('GameInventorAgent: llmClient is required');
    expect(mockLogger.error).toHaveBeenCalledWith('GameInventorAgent error', { traceId, error: expect.any(Error) });
  });

  it('loads prompt and calls llmClient.chatCompletion with correct prompt', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({ name: 'Test Name', description: 'desc' }) };
    const sharedState = createSharedState();
    await GameInventorAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(fs.readFileSync).toHaveBeenCalledWith(promptPath, 'utf8');
    expect(llmClient.chatCompletion).toHaveBeenCalledWith({
      prompt: expect.stringContaining(promptTemplate),
      outputType: 'json-object'
    });
  });

  it('throws if LLM output is missing required fields', async () => {
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue({ name: 'OnlyName' }) };
    const sharedState = createSharedState();
    await expect(GameInventorAgent(sharedState, { logger: mockLogger, traceId, llmClient })).rejects.toThrow('GameInventorAgent: LLM output missing required fields');
  });

  it('updates sharedState with name and description', async () => {
    const sharedState = createSharedState();
    const parsed = { name: 'Test Name', description: 'desc' };
    const llmClient = { chatCompletion: jest.fn().mockResolvedValue(parsed) };
    await GameInventorAgent(sharedState, { logger: mockLogger, traceId, llmClient });
    expect(sharedState.name).toBe(parsed.name);
    expect(sharedState.name).toBe(parsed.name);
    expect(sharedState.description).toBe(parsed.description);
  });
});
