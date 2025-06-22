const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createPlayabilityValidatorChain } = require('../../agents/chains/PlayabilityValidatorChain');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs/promises');

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
      const chain = await createPlayabilityValidatorChain();
      const result = await chain.invoke({ mechanics: ['move left/right'], winCondition: 'Reach the exit.' });
      expect(result).toBeDefined();
      expect(typeof result.winnable).toBe('boolean');
      expect(typeof result.suggestion).toBe('string');
    });
  });
});
