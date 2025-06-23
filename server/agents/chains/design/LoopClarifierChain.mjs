import { PromptTemplate } from '@langchain/core/prompts';
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
    // Try to match 'Loop: ...' pattern
    const match = output.content.match(/Loop:\s*(.*)/);
    if (match) {
      return { loop: match[1].trim() };
    }
    // Fallback: only accept if content is non-empty and not a generic negative
    const fallback = output.content.trim();
    const negativePatterns = [/^no loop here\.?$/i, /^none$/i, /^n\/a$/i, /^not applicable$/i];
    if (!fallback || negativePatterns.some(rx => rx.test(fallback))) {
      console.error('[LoopClarifierChain] Fallback rejected: output is empty or negative. Output:', fallback);
      throw new Error('Output missing required loop string');
    }
    console.warn('[LoopClarifierChain] No "Loop:" prefix found, using full content as loop description. Output:', fallback);
    return { loop: fallback };
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
