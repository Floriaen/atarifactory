import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createPlayabilityHeuristicChain(llmOptionsOrInstance) {
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
    return output.content.trim();
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke({ gameDef } = {}) {
      if (!gameDef || typeof gameDef !== 'object') {
        throw new Error('Input must have a gameDef object');
      }
      const result = await chain.invoke({ gameDef });
      if (!result || typeof result !== 'string') {
        throw new Error('Output missing required playability string');
      }
      return result;
    }
  };
}
export { createPlayabilityHeuristicChain };
export const PlayabilityHeuristicChain = { invoke: async (input) => createPlayabilityHeuristicChain().invoke(input) };
