// LLM-injected EntityListBuilderChain (DI pattern)
// Langchain-powered EntityListBuilderChain with DI
const { LLMChain, PromptTemplate } = require('langchain');
const fs = require('fs');
const path = require('path');

function createEntityListBuilderChain(llm) {
  // Load external prompt from markdown file
  const promptPath = path.join(__dirname, '../../prompts/design/entity-list-builder.md');
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
      // Call the chain with input
      const result = await chain.call(input);
      if (!result || !Array.isArray(result.entities)) {
        throw new Error('Output missing required entities array');
      }
      return result;
    }
  };
}
module.exports = { createEntityListBuilderChain };