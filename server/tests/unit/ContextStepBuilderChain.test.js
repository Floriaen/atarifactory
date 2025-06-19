const { createContextStepBuilderChain } = require('../../agents/langchain/chains/ContextStepBuilderChain');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

describe('ContextStepBuilderChain', () => {
  let promptString;
  beforeAll(async () => {
    const promptPath = path.join(__dirname, '../../agents/langchain/prompts/ContextStepBuilderChain.prompt.md');
    promptString = await fs.readFile(promptPath, 'utf8');
  });

  it('loads the prompt template with correct variables', () => {
    expect(promptString).toContain('{{gameSource}}');
    expect(promptString).toContain('{{plan}}');
    expect(promptString).toContain('{{step}}');
  });

  it('parses output string using StringOutputParser', async () => {
    const { StringOutputParser } = require('@langchain/core/output_parsers');
    const parser = new StringOutputParser();
    const output = await parser.invoke({ content: 'function foo() { return 1; }' });
    expect(output).toBe('function foo() { return 1; }');
  });

  it('integration: runs end-to-end with real OpenAI if API key is present', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Skipping integration test: no OPENAI_API_KEY');
      return;
    }
    const { ChatOpenAI } = require('@langchain/openai');
    const chain = await createContextStepBuilderChain(new ChatOpenAI({ model: 'gpt-3.5-turbo', temperature: 0 }));
    const result = await chain.invoke({
      gameSource: 'function foo() {}',
      plan: JSON.stringify([{ id: 1, description: 'Add player' }]),
      step: JSON.stringify({ id: 1, description: 'Add player' })
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
