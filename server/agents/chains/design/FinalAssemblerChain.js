const { LLMChain, PromptTemplate } = require('langchain');
const fs = require('fs');
const path = require('path');

function createFinalAssemblerChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/final-assembler.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['title', 'pitch', 'mechanics', 'winCondition', 'entities']
  });
  const chain = new LLMChain({ llm, prompt });

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.title || !input.pitch || !input.mechanics || !input.winCondition || !input.entities) {
        throw new Error('Input must be an object with title, pitch, mechanics, winCondition, and entities');
      }
      const result = await chain.call(input);
      if (!result || !result.gameDef) {
        throw new Error('Output missing required gameDef fields');
      }
      return result;
    }
  };
}
module.exports = { createFinalAssemblerChain };
