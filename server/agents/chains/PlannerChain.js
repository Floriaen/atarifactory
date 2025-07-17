import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { plannerSchema } from '../../schemas/langchain-schemas.js';
import logger from '../../utils/logger.js';

export const CHAIN_STATUS = {
  name: 'PlannerChain',
  label: 'Planner',
  description: 'Breaking down game into implementation steps',
  category: 'planning'
};

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for PlannerChain with structured output
async function createPlannerChain(llm) {
  const promptPath = path.join(__dirname, '../prompts/PlannerChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  logger.debug('PlannerChain prompt template', { promptString });
  const plannerPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['gameDefinition']
  });

  // Use structured output instead of manual JSON parsing
  const structuredLLM = llm.withStructuredOutput(plannerSchema);

  // Return a custom chain that logs the hydrated prompt before invoking the LLM
  return {
    async invoke(input) {
      // Ensure gameDefinition is stringified for prompt injection
      const formattedInput = {
        ...input,
        gameDefinition: typeof input.gameDefinition === 'string' ? input.gameDefinition : JSON.stringify(input.gameDefinition, null, 2)
      };
      logger.debug('PlannerChain input to prompt', { formattedInput });
      const hydratedPrompt = await plannerPrompt.format(formattedInput);
      // logger.debug('PlannerChain hydrated prompt', { hydratedPrompt });
      
      try {
        const result = await structuredLLM.invoke(hydratedPrompt);
        logger.debug('PlannerChain structured output', { result });
        // Extract the plan array from the wrapped object
        return result.plan || result;
      } catch (err) {
        logger.error('PlannerChain failed to get structured output', { error: err.message, stack: err.stack });
        throw err;
      }
    }
  };

}

export { createPlannerChain };