import { createPlanningChain } from '../../utils/chainFactory.js';
import { plannerSchema } from '../../schemas/langchain-schemas.js';
import logger from '../../utils/logger.js';

export const CHAIN_STATUS = {
  name: 'PlannerChain',
  label: 'Planner',
  description: 'Breaking down game into implementation steps',
  category: 'planning'
};

/**
 * Creates a PlannerChain using standardized factory
 * @param {Object} llm - Optional custom LLM instance
 * @param {Object} options - Chain options
 * @param {Object} options.sharedState - Shared state for token counting
 * @returns {Promise<Object>} Configured chain instance
 */
async function createPlannerChain(llm, options = {}) {
  const { sharedState } = options;

  return createPlanningChain({
    chainName: 'PlannerChain',
    promptFile: 'PlannerChain.prompt.md',
    inputVariables: ['gameDefinition'],
    schema: plannerSchema,
    llm,
    sharedState,
    customInvoke: async (input, baseChain, { chainName }) => {
      // Ensure gameDefinition is stringified for prompt injection
      const formattedInput = {
        ...input,
        gameDefinition: typeof input.gameDefinition === 'string'
          ? input.gameDefinition
          : JSON.stringify(input.gameDefinition, null, 2)
      };

      logger.debug('PlannerChain input to prompt', { formattedInput });

      try {
        const result = await baseChain.invoke(formattedInput);
        logger.debug('PlannerChain structured output', { result });

        // Extract the plan array from the wrapped object
        // The schema wraps the plan in { plan: [...] }
        return result.plan || result;
      } catch (err) {
        logger.error('PlannerChain failed to get structured output', {
          error: err.message,
          stack: err.stack
        });
        throw err;
      }
    }
  });
}

export { createPlannerChain };