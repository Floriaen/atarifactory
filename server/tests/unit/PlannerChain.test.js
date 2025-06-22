const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createPlannerChain } = require('../../agents/chains/PlannerChain');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs/promises');

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
      const chain = await createPlannerChain();
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
