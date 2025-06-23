import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createPlayabilityHeuristicChain(llm) {
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

  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createPlayabilityHeuristicChain requires an LLM instance with an .invoke method');
  }

  function parseLLMOutput(output) {
    if (!output || typeof output.content !== 'string') {
      throw new Error('LLM output missing content');
    }
    const raw = output.content.trim();
    console.debug('[PlayabilityHeuristicChain] Raw LLM output:', raw);
    try {
      const json = JSON.parse(raw);
      if (
        typeof json.playabilityScore === 'number' &&
        typeof json.rationale === 'string'
      ) {
        return json;
      }
    } catch (e) {
      // No fallback: LLM must return valid JSON
      console.error('[PlayabilityHeuristicChain] Output missing required JSON fields. Output:', raw);
      throw new Error('Output missing required playabilityScore and rationale');
    }
  }

  const chain = prompt.pipe(llm).pipe(parseLLMOutput);

  return {
    async invoke({ gameDef } = {}) {
      if (!gameDef || typeof gameDef !== 'object') {
        throw new Error('Input must have a gameDef object');
      }
      const result = await chain.invoke({ gameDef });
      if (!result || typeof result !== 'object' || typeof result.playabilityScore !== 'number' || typeof result.rationale !== 'string') {
        throw new Error('Output missing required playabilityScore and rationale');
      }
      return result;
    }
  };
}
export { createPlayabilityHeuristicChain };
export const PlayabilityHeuristicChain = { invoke: async (input) => createPlayabilityHeuristicChain().invoke(input) };
