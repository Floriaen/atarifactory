import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createWinConditionBuilderChain(llmOptionsOrInstance) {
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

  let llm;
  if (llmOptionsOrInstance && typeof llmOptionsOrInstance.invoke === 'function') {
    llm = llmOptionsOrInstance;
  } else {
    llm = new ChatOpenAI(llmOptionsOrInstance);
  }

  function parseLLMOutput(output) {
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    return { winCondition: output.content.trim() };
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.mechanics) {
        throw new Error('Input must be an object with mechanics');
      }
      const result = await chain.invoke(input);
      if (!result.winCondition || typeof result.winCondition !== 'string') {
        throw new Error('Output missing required winCondition string');
      }
      return result;
    }
  };
}
export { createWinConditionBuilderChain };
export const WinConditionBuilderChain = { invoke: async (input) => createWinConditionBuilderChain().invoke(input) };
