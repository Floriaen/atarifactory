import { LLMChain, PromptTemplate } from '@langchain/core';
import fs from 'fs';
import path from 'path';

function createIdeaGeneratorChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/idea-generator.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['constraints']
  });
  const chain = new LLMChain({ llm, prompt });

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object') {
        throw new Error('Input must be an object');
      }
      const result = await chain.call(input);
      if (!result.title || !result.pitch) {
        throw new Error('Output missing required fields');
      }
      return result;
    }
  };
}
export { createIdeaGeneratorChain };
