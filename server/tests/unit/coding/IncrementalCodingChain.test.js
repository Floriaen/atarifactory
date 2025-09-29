import { describe, it, expect } from 'vitest';
import { createIncrementalCodingChain } from '../../../agents/chains/coding/IncrementalCodingChain.js';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { MockLLM } from '../../helpers/MockLLM.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Timeout handled by Vitest config
describe('IncrementalCodingChain', () => {
  function buildMockLLM(content) {
    const mock = new MockLLM(content);
    mock.withConfig = function () { return this; };
    return mock;
  }
  let systemPromptString, humanPromptString;
  beforeAll(async () => {
    const systemPromptPath = path.join(__dirname, '../../../agents/prompts/coding/IncrementalCodingChain.system.prompt.md');
    const humanPromptPath = path.join(__dirname, '../../../agents/prompts/coding/IncrementalCodingChain.human.prompt.md');
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
    const chain = await createIncrementalCodingChain(buildMockLLM('function foo(){}'));
    const result = await chain.invoke({ gameSource: '', plan: '[]', step: '{}' });
    expect(result).toBe('function foo(){}');
  });

  it('produces valid JS when LLM returns code', async () => {
    const mockCode = `const canvas = document.getElementById('game-canvas');\nconst ctx = canvas.getContext('2d');\nfunction gameLoop(){ ctx.clearRect(0,0,canvas.width,canvas.height); requestAnimationFrame(gameLoop); }\ngameLoop();`;
    const chain = await createIncrementalCodingChain(buildMockLLM(mockCode));
    const result = await chain.invoke({
      gameSource: '',
      plan: JSON.stringify([{ id: 1, description: 'Bootstrap game loop' }]),
      step: JSON.stringify({ id: 1, description: 'Bootstrap game loop' })
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('gameLoop');
    expect(() => new Function(result)).not.toThrow();
  });
});
