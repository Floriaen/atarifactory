const { createContextStepBuilderChain } = require('../../agents/chains/ContextStepBuilderChain');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

describe('ContextStepBuilderChain', () => {
  let promptString;
  beforeAll(async () => {
    const promptPath = path.join(__dirname, '../../agents/prompts/ContextStepBuilderChain.prompt.md');
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
    const modelName = process.env.OPENAI_MODEL || 'gpt-4.1';
    const chain = await createContextStepBuilderChain(new ChatOpenAI({ model: modelName, temperature: 0 }));
    const result = await chain.invoke({
      gameSource: '// Minimal HTML5 Canvas Game Scaffold\nconst canvas = document.getElementById(\'game-canvas\');\nconst ctx = canvas.getContext(\'2d\');\nfunction gameLoop() { ctx.clearRect(0,0,canvas.width,canvas.height); }\ngameLoop();',
      plan: JSON.stringify([
        { id: 1, description: 'Set up the HTML canvas and main game loop' },
        { id: 2, description: 'Create the player entity and implement left/right movement' },
        { id: 3, description: 'Implement win condition when player reaches the right edge' }
      ]),
      step: JSON.stringify({ id: 1, description: 'Set up the HTML canvas and main game loop' })
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Try to execute the returned code to ensure it is valid JavaScript
    let fn;
    try {
      fn = new Function(result);
    } catch (err) {
      throw new Error('Returned output is not valid JavaScript: ' + err.message + '\nOutput was:\n' + result);
    }
    expect(typeof fn).toBe('function');
    // Optionally, check that no apology or fallback message is present
    expect(result.toLowerCase()).not.toMatch(/sorry|please provide|cannot|apolog/i);
  });
});
