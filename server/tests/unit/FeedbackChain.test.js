const { createFeedbackChain } = require('../../agents/langchain/chains/FeedbackChain');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

describe('FeedbackChain', () => {
  let promptString;
  beforeAll(async () => {
    const promptPath = path.join(__dirname, '../../agents/langchain/prompts/FeedbackChain.prompt.md');
    promptString = await fs.readFile(promptPath, 'utf8');
  });

  it('loads the prompt template with correct variables', () => {
    expect(promptString).toContain('{{runtimeLogs}}');
    expect(promptString).toContain('{{stepId}}');
  });

  it('parses output JSON using JsonOutputParser', async () => {
    const { JsonOutputParser } = require('@langchain/core/output_parsers');
    const parser = new JsonOutputParser();
    const output = await parser.invoke({ content: '{ "retryTarget": "fixer", "suggestion": "Try fixing the code." }' });
    expect(output).toEqual({ retryTarget: 'fixer', suggestion: 'Try fixing the code.' });
  });

  it('integration: runs end-to-end with real OpenAI if API key is present', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Skipping integration test: no OPENAI_API_KEY');
      return;
    }
    const { ChatOpenAI } = require('@langchain/openai');
    const { extractJsonCodeBlock } = require('../../utils/formatter');
    const chain = await createFeedbackChain(new ChatOpenAI({ temperature: 0 }));
    const rawResult = await chain.invoke({
      runtimeLogs: JSON.stringify({
        canvasActive: true,
        inputResponsive: false,
        playerMoved: false,
        winConditionReachable: false,
        log: [
          { event: 'keydown', key: 'ArrowLeft', handled: false },
          { event: 'render', frame: 1 }
        ]
      }),
      stepId: '2-add-player-entity'
    });
    let result;
    try {
      result = typeof rawResult === 'object' && rawResult.retryTarget ? rawResult : extractJsonCodeBlock(typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult));
    } catch (err) {
      console.error('LLM raw output:', rawResult);
      throw new Error('Failed to extract valid JSON from LLM output: ' + err.message);
    }
    expect(result).toHaveProperty('retryTarget');
    expect(result).toHaveProperty('suggestion');
  });
});
