import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createMechanicExtractorChain(llmOptionsOrInstance) {
  const promptPath = path.join(__dirname, '../../prompts/design/mechanic-extractor.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['loop']
  });

  let llm;
  if (llmOptionsOrInstance && typeof llmOptionsOrInstance.invoke === 'function') {
    llm = llmOptionsOrInstance;
  } else {
    llm = new ChatOpenAI(llmOptionsOrInstance);
  }

  function parseLLMOutput(output) {
    // Expect output.content to be a comma- or newline-separated list of mechanics
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    // Split into lines, trim, filter empty
    const mechanics = output.content
      .split(/[\n,]/)
      .map(m => m.trim())
      .filter(Boolean);
    if (!Array.isArray(mechanics) || mechanics.length === 0) {
      throw new Error('Output missing required mechanics array');
    }
    return { mechanics };
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || !input.loop) {
        throw new Error('Input must be an object with loop');
      }
      const result = await chain.invoke(input);
      if (!Array.isArray(result.mechanics)) {
        throw new Error('Output missing required mechanics array');
      }
      return result;
    }
  };
}
export { createMechanicExtractorChain };
export const MechanicExtractorChain = { invoke: async (input) => createMechanicExtractorChain().invoke(input) };
