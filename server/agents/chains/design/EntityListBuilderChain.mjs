import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createEntityListBuilderChain(llmOptionsOrInstance) {
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

  let llm;
  if (llmOptionsOrInstance && typeof llmOptionsOrInstance.invoke === 'function') {
    llm = llmOptionsOrInstance;
  } else {
    llm = new ChatOpenAI(llmOptionsOrInstance);
  }

  // Assume LLM returns { content: 'entities: ...' }, so add parser
  function parseLLMOutput(output) {
    if (!output || typeof output.entities === 'undefined') {
      throw new Error('Output missing required entities array');
    }
    return output;
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.mechanics) {
        throw new Error('Input must be an object with mechanics');
      }
      const result = await chain.invoke(input);
      if (!result || !Array.isArray(result.entities)) {
        throw new Error('Output missing required entities array');
      }
      return result;
    }
  };
}
export { createEntityListBuilderChain };
