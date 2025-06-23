import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createWinConditionBuilderChain requires an LLM instance with an .invoke method');
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
