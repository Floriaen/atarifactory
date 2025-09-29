import { describe, it, expect } from 'vitest';
import { createIncrementalCodingChain } from '../../agents/chains/IncrementalCodingChain.js';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Timeout handled by Vitest config
describe('IncrementalCodingChain', () => {
  let systemPromptString, humanPromptString;
  beforeAll(async () => {
    const systemPromptPath = path.join(__dirname, '../../agents/prompts/IncrementalCodingChain.system.prompt.md');
    const humanPromptPath = path.join(__dirname, '../../agents/prompts/IncrementalCodingChain.human.prompt.md');
    systemPromptString = await fs.readFile(systemPromptPath, 'utf8');
    humanPromptString = await fs.readFile(humanPromptPath, 'utf8');
  });

  it('loads the system prompt template (rules) as a non-empty string', () => {
    expect(typeof systemPromptString).toBe('string');
    expect(systemPromptString.length).toBeGreaterThan(0);
    expect(systemPromptString).toContain('STRICT RULES');
  });

  it('loads the human prompt template with correct variables', () => {
    expect(humanPromptString).toContain('{gameSource}');
    expect(humanPromptString).toContain('{plan}');
    expect(humanPromptString).toContain('{step}');
  });

  it('parses output string using StringOutputParser', async () => {
    // StringOutputParser is now imported at the top
    const parser = new StringOutputParser();
    const output = await parser.invoke({ content: 'function foo() { return 1; }' });
    expect(output).toBe('function foo() { return 1; }');
  });

  it('defaults entities to [] when not provided', async () => {
    const llm = {
      withStructuredOutput() { return this; },
      withConfig() { return this; },
      async invoke() { return { content: 'function foo(){}' }; }
    };
    const chain = await createIncrementalCodingChain(llm);
    const result = await chain.invoke({ gameSource: '', plan: '[]', step: '{}' });
    expect(result).toBe('function foo(){}');
  });

  it('integration: runs end-to-end with real OpenAI if API key is present', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Skipping integration test: no OPENAI_API_KEY');
      return;
    }
    // ChatOpenAI is now imported at the top
    const modelName = process.env.OPENAI_MODEL;
    const chain = await createIncrementalCodingChain(new ChatOpenAI({ model: modelName, temperature: 0 }));
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
