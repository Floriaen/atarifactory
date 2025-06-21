const { LLMChain, PromptTemplate } = require('langchain');
const fs = require('fs');
const path = require('path');

function createPlayabilityHeuristicChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/playability-heuristic.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['gameDef']
  });
  const chain = new LLMChain({ llm, prompt });

  return {
    async invoke({ gameDef } = {}) {
      if (!gameDef || typeof gameDef !== 'object') {
        throw new Error('Input must have a gameDef object');
      }
      const result = await chain.call({ gameDef });
      if (!result || typeof result !== 'string') {
        throw new Error('Output missing required playability string');
      }
      return result;
    }
  };
}
module.exports = { createPlayabilityHeuristicChain };
