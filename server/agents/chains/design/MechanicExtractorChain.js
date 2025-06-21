const { LLMChain, PromptTemplate } = require('langchain');
const fs = require('fs');
const path = require('path');

function createMechanicExtractorChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/mechanic-extractor.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['loop']
  });
  const chain = new LLMChain({ llm, prompt });

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.loop) {
        throw new Error('Input must be an object with loop');
      }
      const result = await chain.call(input);
      if (!Array.isArray(result.mechanics)) {
        throw new Error('Output missing required mechanics array');
      }
      return result;
    }
  };
}
module.exports = { createMechanicExtractorChain };
