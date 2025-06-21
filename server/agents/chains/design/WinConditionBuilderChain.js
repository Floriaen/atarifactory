const { LLMChain, PromptTemplate } = require('langchain');
const fs = require('fs');
const path = require('path');

function createWinConditionBuilderChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/win-condition-builder.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['mechanics']
  });
  const chain = new LLMChain({ llm, prompt });

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.mechanics) {
        throw new Error('Input must be an object with mechanics');
      }
      const result = await chain.call(input);
      if (!result.winCondition || typeof result.winCondition !== 'string') {
        throw new Error('Output missing required winCondition string');
      }
      return result;
    }
  };
}
module.exports = { createWinConditionBuilderChain };
