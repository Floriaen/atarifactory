import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createFinalAssemblerChain(llmOptionsOrInstance) {
  const promptPath = path.join(__dirname, '../../prompts/design/final-assembler.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');

  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['title', 'mechanics', 'winCondition', 'entities']
  });

  let llm;
  if (llmOptionsOrInstance && typeof llmOptionsOrInstance.invoke === 'function') {
    llm = llmOptionsOrInstance;
  } else {
    llm = new ChatOpenAI(llmOptionsOrInstance);
  }

  function parseLLMOutput(output) {
    if (!output || !output.gameDef) {
      throw new Error('Output missing required gameDef fields');
    }
    return output;
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' ||
          !('title' in input) ||

          !('mechanics' in input) ||
          !('winCondition' in input) ||
          !('entities' in input)) {
        throw new Error('Input must be an object with title, mechanics, winCondition, and entities');
      }
      const result = await chain.invoke(input);
      if (!result || !result.gameDef) {
        throw new Error('Output missing required gameDef fields');
      }
      return result;
    }
  };
}
export { createFinalAssemblerChain };
