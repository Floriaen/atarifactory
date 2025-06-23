import { PromptTemplate } from '@langchain/core/prompts';
import { lcelChainWithContentWrapper } from '../../../utils/lcelChainWithContentWrapper.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createFinalAssemblerChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/final-assembler.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');

  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['title', 'pitch', 'loop', 'mechanics', 'winCondition', 'entities']
  });

  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createFinalAssemblerChain requires an LLM instance with an .invoke method');
  }

  function parseLLMOutput(output) {
    // DEBUG: log what is received from the LLM
    console.debug('[FinalAssemblerChain.parseLLMOutput] Received output:', output);
    // Expect output.content to be a JSON string with { gameDef }
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    let data;
    try {
      data = JSON.parse(output.content);
    } catch (err) {
      throw new Error('LLM output is not valid JSON');
    }
    if (!data || typeof data !== 'object' || !data.gameDef) {
      throw new Error('LLM output missing required gameDef field');
    }
    return data;
  }


  const chain = lcelChainWithContentWrapper(prompt, llm, parseLLMOutput);

  return {
    async invoke(input) {
      if (
        !input || typeof input !== 'object' ||
        !('title' in input) ||
        !('pitch' in input) ||
        !('loop' in input) ||
        !('mechanics' in input) ||
        !('winCondition' in input) ||
        !('entities' in input)
      ) {
        throw new Error('Input must be an object with title, pitch, loop, mechanics, winCondition, and entities');
      }
      const result = await chain.invoke(input);
      if (!result || !result.gameDef) {
        throw new Error('Output missing required gameDef field');
      }
      return result;
    }
  };
}
export { createFinalAssemblerChain };
