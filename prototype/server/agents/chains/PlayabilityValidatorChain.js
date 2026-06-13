import { createValidationChain } from '../../utils/chainFactory.js';
import { playabilityValidatorSchema } from '../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'PlayabilityValidatorChain',
  label: 'Playability Validator',
  description: 'Checking if game design is playable',
  category: 'planning'
};

/**
 * Creates a PlayabilityValidatorChain using standardized factory
 * @param {Object} llm - Optional custom LLM instance
 * @param {Object} options - Chain options
 * @param {Object} options.sharedState - Shared state for token counting
 * @returns {Promise<Object>} Configured chain instance
 */
async function createPlayabilityValidatorChain(llm, options = {}) {
  const { sharedState } = options;

  return createValidationChain({
    chainName: 'PlayabilityValidatorChain',
    promptFile: 'PlayabilityValidatorChain.prompt.md',
    inputVariables: ['mechanics', 'winCondition'],
    schema: playabilityValidatorSchema,
    llm,
    sharedState
  });
}

export { createPlayabilityValidatorChain };