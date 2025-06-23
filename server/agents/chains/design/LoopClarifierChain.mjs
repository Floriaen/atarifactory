import { PromptTemplate } from '@langchain/core/prompts';
import { lcelChainWithContentWrapper } from '../../../utils/lcelChainWithContentWrapper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createLoopClarifierChain(llm) {
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

  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createLoopClarifierChain requires an LLM instance with an .invoke method');
  }

  function parseLLMOutput(output) {
    // DEBUG: Log the LLM output before parsing
    console.debug('[LoopClarifierChain] Raw LLM output:', output);
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    let data;
    try {
      data = JSON.parse(output.content);
    } catch (err) {
      throw new Error('LLM output is not valid JSON');
    }
    if (!data || typeof data !== 'object' || !data.loop || typeof data.loop !== 'string') {
      throw new Error('LLM output missing required field: loop');
    }
    return { loop: data.loop };
  }

  const chain = lcelChainWithContentWrapper(prompt, llm, parseLLMOutput);

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
