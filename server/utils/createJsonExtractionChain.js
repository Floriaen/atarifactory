import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda } from '@langchain/core/runnables';
import { ensureContentPresent } from './ensureContentPresent.js';
import fs from 'fs';
import path from 'path';

/**
 * Generic factory for LCEL JSON extraction chains.
 * @param {Object} opts
 * @param {object} opts.llm - The LLM instance (must have .invoke).
 * @param {string} opts.promptFile - Absolute path to the prompt file.
 * @param {string[]} opts.inputVariables - Variables for the prompt template.
 * @param {string} [opts.schemaName] - Optional, for error messages.
 * @returns {{ invoke: (input: object) => Promise<object> }}
 */
export function createJsonExtractionChain({ llm, promptFile, inputVariables, schemaName = 'output' }) {
  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createJsonExtractionChain requires an LLM instance with an .invoke method');
  }
  let promptString;
  try {
    promptString = fs.readFileSync(promptFile, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const prompt = new PromptTemplate({
    template: promptString + '\n' + formatInstructions,
    inputVariables
  });

  const chain = prompt
    .pipe(llm)
    .pipe(RunnableLambda.from(ensureContentPresent))
    .pipe(parser);

  return {
    async invoke(input) {
      if (!input || typeof input !== 'object' || inputVariables.some(v => !(v in input))) {
        throw new Error(
          `Input must be an object with required fields: ${inputVariables.join(', ')}`
        );
      }
      const result = await chain.invoke(input);
      if (!result || typeof result !== 'object') {
        throw new Error(`Output missing required ${schemaName} object`);
      }
      return result;
    }
  };
}
