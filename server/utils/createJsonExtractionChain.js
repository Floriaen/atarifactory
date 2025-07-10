import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda } from '@langchain/core/runnables';
import { ensureContentPresent } from './ensureContentPresent.js';
import fs from 'fs';

/**
 * Generic factory for LCEL JSON extraction chains.
 * @param {Object} opts
 * @param {object} opts.llm - The LLM instance (must have .invoke).
 * @param {string} opts.promptFile - Absolute path to the prompt file.
 * @param {string[]} opts.inputVariables - Variables for the prompt template.
 * @param {string} [opts.schemaName] - Optional, for error messages.
 * @returns {{ invoke: (input: object) => Promise<object> }}
 */
import { estimateTokens } from '../utils/tokenUtils.js';

export function createJsonExtractionChain({ llm, promptFile, inputVariables, schemaName = 'output', sharedState } = {}) {
  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createJsonExtractionChain requires an LLM instance with an .invoke method');
  }
  let promptString;
  try {
    promptString = fs.readFileSync(promptFile, 'utf8');
  } catch {
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
      const effectiveSharedState = sharedState;

      if (!input || typeof input !== 'object' || inputVariables.some(v => !(v in input))) {
        throw new Error(
          `Input must be an object with required fields: ${inputVariables.join(', ')}`
        );
      }
      const result = await chain.invoke(input);
      // Token counting logic
      if (effectiveSharedState && typeof effectiveSharedState.tokenCount === 'number') {
        // Try to get content from LLM result (mock or real)
        let content = '';
        if (result && typeof result === 'object') {
          if (result.content) {
            content = result.content;
          } else if (typeof result === 'string') {
            content = result;
          } else {
            content = JSON.stringify(result);
          }
        }
        // Fallback: if input has constraints or prompt, add those too
        if (input && input.constraints) content += input.constraints;
        // Estimate and increment tokens
        effectiveSharedState.tokenCount += estimateTokens(content);
      }

      if (!result || typeof result !== 'object') {
        throw new Error(`Output missing required ${schemaName} object`);
      }
      return result;
    }
  };
}
