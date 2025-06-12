const SmartOpenAI = require('../../utils/SmartOpenAI');

test('chatCompletion returns the Promise from the LLM client', async () => {
  const mockLLM = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Promise resolved' } }]
        })
      }
    }
  };
  const smartOpenAI = new SmartOpenAI(mockLLM);
  const result = smartOpenAI.chatCompletion({ prompt: 'test prompt', outputType: 'string' });
  expect(result).toBeInstanceOf(Promise);
  await expect(result).resolves.toBe('Promise resolved');
});

test('chatCompletion handles JSON extraction from code block', async () => {
  const mockLLM = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '```json\n{"key": "value"}\n```' } }]
        })
      }
    }
  };
  const smartOpenAI = new SmartOpenAI(mockLLM);
  const result = await smartOpenAI.chatCompletion({ prompt: 'test', outputType: 'json-object' });
  expect(result).toEqual({ key: 'value' });
});

test('chatCompletion handles invalid JSON', async () => {
  const mockLLM = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'invalid json' } }]
        })
      }
    }
  };
  const smartOpenAI = new SmartOpenAI(mockLLM);
  await expect(smartOpenAI.chatCompletion({ prompt: 'test', outputType: 'json-object' })).rejects.toThrow('SmartOpenAI: LLM output was not valid json-object');
});

test('chatCompletion handles different output types', async () => {
  const mockLLM = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'plain text' } }]
        })
      }
    }
  };
  const smartOpenAI = new SmartOpenAI(mockLLM);
  const result = await smartOpenAI.chatCompletion({ prompt: 'test', outputType: 'string' });
  expect(result).toBe('plain text');
}); 