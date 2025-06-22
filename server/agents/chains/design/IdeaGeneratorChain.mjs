import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';

function createIdeaGeneratorChain(llmOptionsOrInstance) {
  const promptPath = path.join(__dirname, '../../prompts/design/idea-generator.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['constraints'],
  });

  // Support both injected LLM (for testing) and options (for prod)
  let llm;
  if (llmOptionsOrInstance && typeof llmOptionsOrInstance.invoke === 'function') {
    llm = llmOptionsOrInstance;
  } else {
    llm = new ChatOpenAI(llmOptionsOrInstance);
  }

  // Add a parser after the LLM to extract {title, pitch}
  function parseLLMOutput(output) {
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    // Parse: Title: ...\nPitch: ...
    const match = output.content.match(/Title:\s*(.*)\nPitch:\s*(.*)/);
    if (!match) {
      throw new Error('LLM output not in expected format');
    }
    return { title: match[1].trim(), pitch: match[2].trim() };
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object') {
        throw new Error('Input must be an object');
      }
      const result = await chain.invoke(input);
      if (!result.title || !result.pitch) {
        throw new Error('Output missing required fields');
      }
      return result;
    }
  };
}
export { createIdeaGeneratorChain };
export default { invoke: async (input) => createIdeaGeneratorChain().invoke(input) };

