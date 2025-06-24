const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createPlayabilityAutoFixChain } = require('../../agents/chains/PlayabilityAutoFixChain');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs/promises');

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
    it('returns correct output shape', async () => {
      const mockChain = {
        invoke: async () => ({
          name: 'Coin Collector',
          description: 'Collect all coins while avoiding obstacles.',
          mechanics: ['move left/right', 'jump'],
          winCondition: 'All coins collected.',
          entities: ['player', 'coin', 'obstacle']
        })
      };
      const result = await mockChain.invoke({
        gameDef: JSON.stringify({ name: 'Coin Collector', mechanics: ['move left/right'] }),
        suggestion: 'Add jump mechanic.'
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Coin Collector');
      expect(result.entities).toContain('coin');
      expect(Array.isArray(result.mechanics)).toBe(true);
      expect(result.winCondition).toMatch(/All coins collected/);
    });
  });

  // 4. Integration test: real chain, real LLM
  describe('Integration (real chain, real LLM)', () => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    (hasKey ? it : it.skip)('runs end-to-end with real LLM', async () => {
      const chain = await createPlayabilityAutoFixChain();
      const gameDef = {
        name: 'Coin Collector',
        description: 'Collect all coins while avoiding obstacles.',
        mechanics: ['move left/right'],
        winCondition: 'All coins collected.',
        entities: ['player', 'coin', 'obstacle']
      };
      const result = await chain.invoke({
        gameDef: JSON.stringify(gameDef),
        suggestion: 'Add jump mechanic.'
      });
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.mechanics)).toBe(true);
      expect(result.winCondition).toBeDefined();
    });
  });
});
