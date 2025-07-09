// PlayabilityAutoFixChain.test.mjs
// ESM migration: allows direct import of MockLLM (ESM) and other ESM helpers
import { MockLLM } from '../helpers/MockLLM.js';
import { createPlayabilityAutoFixChain } from '../../agents/chains/PlayabilityAutoFixChain.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PlayabilityAutoFixChain Pipeline Tests', () => {
  // 1. Unit test: Output parser
  describe('JsonOutputParser', () => {
    it('parses JSON output string', async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          name: 'Coin Collector',
          description: 'Collect all coins while avoiding obstacles.',
          mechanics: ['move left/right', 'jump'],
          winCondition: 'All coins collected.',
          entities: ['player', 'coin', 'obstacle']
        }) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(result).toEqual({
        name: 'Coin Collector',
        description: expect.stringContaining('Collect all coins'),
        mechanics: expect.arrayContaining(['move left/right', 'jump']),
        winCondition: expect.stringContaining('All coins collected'),
        entities: expect.arrayContaining(['player', 'coin', 'obstacle'])
      });
    });
  });

  // 2. Unit test: Prompt template
  describe('Prompt Template', () => {
    it('loads prompt file and checks content', async () => {
      const promptPath = path.join(__dirname, '../../agents/prompts/PlayabilityAutoFixChain.prompt.md');
      const promptString = await fs.readFile(promptPath, 'utf8');
      expect(promptString).toMatch(/gameDef/);
      expect(promptString).toMatch(/suggestion/);
    });
  });

  // 3. Contract test: mock chain
  describe('Mock chain contract', () => {
    it('returns correct output shape with a mock LLM Runnable', async () => {
      const mockContent =
        '```json\n' + JSON.stringify({
          name: 'Coin Collector',
          description: 'Collect all coins while avoiding obstacles.',
          mechanics: ['move left/right', 'jump'],
          winCondition: 'All coins collected.',
          entities: ['player', 'coin', 'obstacle']
        }) + '\n```';
      const mockLLM = new MockLLM(mockContent);
      const chain = await createPlayabilityAutoFixChain(mockLLM);
      const result = await chain.invoke({
        gameDef: JSON.stringify({ name: 'Coin Collector', mechanics: ['move left/right'] }),
        suggestion: 'Add jump mechanic.'
      });
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('mechanics');
      expect(result).toHaveProperty('winCondition');
      expect(result).toHaveProperty('entities');
      expect(result.mechanics).toContain('jump');
    });
  });
});
