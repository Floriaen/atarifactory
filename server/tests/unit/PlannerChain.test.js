import path from 'path';
import dotenv from 'dotenv';
import { describe, it, expect } from 'vitest';
import { createPlannerChain } from '../../agents/chains/PlannerChain.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ChatOpenAI } from '@langchain/openai';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Timeout handled by Vitest config
describe('PlannerChain Pipeline Tests', () => {
  // 1. Unit test: Output parser
  describe('JsonOutputParser', () => {
    it('parses JSON array output string', async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify([
          { id: 1, description: 'Add player entity.' },
          { id: 2, description: 'Add controls for player movement.' },
          { id: 3, description: 'Add coin entities.' },
          { id: 4, description: 'Add win condition logic.' }
        ]) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('description');
    });
  });

  // 2. Unit test: Prompt template
  describe('Prompt Template', () => {
    it('loads prompt file and checks content', async () => {
      const promptPath = path.join(__dirname, '../../agents/prompts/PlannerChain.prompt.md');
      const promptString = await fs.readFile(promptPath, 'utf8');
      expect(promptString).toMatch(/gameDefinition/);
      expect(promptString).toMatch(/JSON array/);
    });
  });

  // 3. Contract test: mock chain
  describe('Mock chain contract', () => {
    it('returns correct output shape', async () => {
      const mockChain = {
        invoke: async () => ([
          { id: 1, description: 'Add player entity.' },
          { id: 2, description: 'Add controls for player movement.' }
        ])
      };
      const result = await mockChain.invoke({
        gameDefinition: JSON.stringify({ name: 'Coin Collector', mechanics: ['move left/right'] })
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('description');
      expect(typeof result[0].id).toBe('number');
      expect(typeof result[0].description).toBe('string');
    });
  });

  // 4. Integration test: real chain, real LLM
  describe('Integration (real chain, real LLM)', () => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    (hasKey ? it : it.skip)('runs end-to-end with real LLM', async () => {
      // ChatOpenAI is now imported at the top
      if (!process.env.OPENAI_MODEL) {
        throw new Error('OPENAI_MODEL environment variable must be set for this test.');
      }
      const llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL,
        temperature: 0,
      });
      const chain = await createPlannerChain(llm);
      const gameDefinition = {
        name: 'Coin Collector',
        description: 'Collect all coins while avoiding obstacles.',
        mechanics: ['move left/right'],
        winCondition: 'All coins collected.',
        entities: ['player', 'coin', 'obstacle']
      };
      const result = await chain.invoke({
        gameDefinition: JSON.stringify(gameDefinition)
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('description');
    });
  });
});
