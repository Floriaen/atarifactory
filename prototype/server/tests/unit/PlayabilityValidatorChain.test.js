import path from 'path';
import dotenv from 'dotenv';
import { describe, it, expect } from 'vitest';
import { createPlayabilityValidatorChain } from '../../agents/chains/PlayabilityValidatorChain.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ChatOpenAI } from '@langchain/openai';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('PlayabilityValidatorChain Pipeline Tests', () => {
  // 1. Unit test: Output parser
  describe('JsonOutputParser', () => {
    it('parses JSON output string', async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          winnable: false,
          suggestion: 'Add a \'jump\' mechanic to reach the exit.'
        }) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(result).toEqual({
        winnable: false,
        suggestion: expect.stringContaining('jump')
      });
    });
  });

  // 2. Unit test: Prompt template
  describe('Prompt Template', () => {
    it('loads prompt file and checks content', async () => {
      const promptPath = path.join(__dirname, '../../agents/prompts/PlayabilityValidatorChain.prompt.md');
      const promptString = await fs.readFile(promptPath, 'utf8');
      expect(promptString).toMatch(/mechanics/);
      expect(promptString).toMatch(/winCondition/);
    });
  });

  // 3. Contract test: mock chain
  describe('Mock chain contract', () => {
    it('returns correct output shape', async () => {
      const mockChain = {
        invoke: async () => ({
          winnable: true,
          suggestion: 'None needed.'
        })
      };
      const result = await mockChain.invoke({ mechanics: ['move left/right'], winCondition: 'Reach the exit.' });
      expect(result).toBeDefined();
      expect(typeof result.winnable).toBe('boolean');
      expect(typeof result.suggestion).toBe('string');
    });
  });

  // 4. Integration test: real chain, real LLM
  describe('Integration (real chain, real LLM)', () => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    (hasKey ? it : it.skip)('runs end-to-end with real LLM', async () => {
      // ChatOpenAI is now imported at the top
      const llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL, temperature: 0 });
      const chain = await createPlayabilityValidatorChain(llm);
      const result = await chain.invoke({ mechanics: ['move left/right'], winCondition: 'Reach the exit.' });
      expect(result).toBeDefined();
      expect(typeof result.winnable).toBe('boolean');
      expect(typeof result.suggestion).toBe('string');
    }, 20000);
  });
});
