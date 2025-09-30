import { createStandardChain } from '../../utils/chainFactory.js';
import { JsonOutputParser } from '@langchain/core/output_parsers';

/**
 * Creates a PlayabilityAutoFixChain using standardized factory
 *
 * Note: This chain returns a flat JSON object (not using playabilityAutoFixSchema)
 * because the prompt explicitly asks for a flat structure and the pipeline expects it.
 *
 * @param {Object} llm - Optional custom LLM instance
 * @param {Object} options - Chain options
 * @param {Object} options.sharedState - Shared state for token counting
 * @returns {Promise<Object>} Configured chain instance
 */
async function createPlayabilityAutoFixChain(llm, options = {}) {
  const { sharedState } = options;

  return createStandardChain({
    chainName: 'PlayabilityAutoFixChain',
    promptFile: 'PlayabilityAutoFixChain.prompt.md',
    inputVariables: ['gameDef', 'suggestion'],
    preset: 'structured',
    llm,
    sharedState,
    customInvoke: async (input, baseChain) => {
      // Create parser to handle JSON extraction from LLM output
      const parser = new JsonOutputParser();
      const llmOutput = await baseChain.invoke(input);

      // Extract string content from LLM response
      const content = typeof llmOutput === 'string'
        ? llmOutput
        : (llmOutput?.content || JSON.stringify(llmOutput));

      // Parse the LLM output to extract JSON
      return parser.parse(content);
    }
  });
}

export { createPlayabilityAutoFixChain };
