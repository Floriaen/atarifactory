import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createIdeaGeneratorChain(llm) {
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
  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createIdeaGeneratorChain requires an LLM instance with an .invoke method');
  }

  // Add a parser after the LLM to extract {title, pitch}
  function parseLLMOutput(output) {
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    let data;
    try {
      data = JSON.parse(output.content);
    } catch (err) {
      throw new Error('LLM output is not valid JSON');
    }
    if (!data || typeof data !== 'object' || !data.title || !data.pitch) {
      throw new Error('LLM output missing required fields (title, pitch)');
    }
    return { title: data.title, pitch: data.pitch };
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

