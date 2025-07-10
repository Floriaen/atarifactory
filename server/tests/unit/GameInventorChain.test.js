import { describe, it, expect } from 'vitest';
import path from 'path';
import dotenv from 'dotenv';
import { createGameInventorChain } from '../../agents/chains/GameInventorChain.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ChatOpenAI } from '@langchain/openai';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('GameInventorChain Pipeline Tests', () => {
  // 1. Unit test: Output parser
  describe('JsonOutputParser', () => {
    it('parses markdown-wrapped JSON string', async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          name: 'The Invincible Knight',
          description: 'A proud knight crossing a dark forest to win the heart of a beautiful princess.'
        }) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(result).toEqual({
        name: 'The Invincible Knight',
        description: expect.stringContaining('knight crossing a dark forest')
      });
    });
  });

  // 2. Unit test: Prompt template
  describe('Prompt Template', () => {
    it('loads prompt file and checks content', async () => {
      const promptPath = path.join(__dirname, '../../agents/prompts/GameInventorChain.prompt.md');
      const promptString = await fs.readFile(promptPath, 'utf8');
      expect(promptString).toMatch(/name/);
      expect(promptString).not.toMatch(/\{.*\}/); // No variables
    });
  });

  // 3. Contract test: mock chain
  describe('Mock chain contract', () => {
    it('returns correct output shape', async () => {
      const mockChain = {
        invoke: async () => ({
          name: 'The Invincible Knight',
          description: 'A proud knight crossing a dark forest to win the heart of a beautiful princess.'
        })
      };
      const result = await mockChain.invoke({});
      expect(result).toBeDefined();
      expect(result.name).toBe('The Invincible Knight');
      expect(result.description).toMatch(/knight crossing a dark forest/);
    });
  });

  // 4. Integration test: real chain + real LLM (skipped unless API key)
  describe('Integration (real chain, real LLM)', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const shouldRun = !!(apiKey && ChatOpenAI);
    (shouldRun ? it : it.skip)('runs end-to-end with real LLM', async () => {
      // Timeout handled by Vitest config
      const chain = await createGameInventorChain(new ChatOpenAI({ temperature: 0, openAIApiKey: apiKey }));
      const result = await chain.invoke({});
      expect(result).toBeDefined();
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
    });
  });


});
