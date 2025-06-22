import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createLoopClarifierChain(llmOptionsOrInstance) {
  const promptPath = path.join(__dirname, '../../prompts/design/loop-clarifier.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['title', 'pitch']
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
    // Parse: Loop: ...
    const match = output.content.match(/Loop:\s*(.*)/);
    if (!match) {
      throw new Error('Output missing required loop string');
    }
    return { loop: match[1].trim() };
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.title || !input.pitch) {
        throw new Error('Input must be an object with title and pitch');
      }
      const result = await chain.invoke(input);
      if (!result.loop || typeof result.loop !== 'string') {
        throw new Error('Output missing required loop string');
      }
      return result;
    }
  };
}
export { createLoopClarifierChain };
export const LoopClarifierChain = { invoke: async (input) => createLoopClarifierChain().invoke(input) };
