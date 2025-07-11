import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { plannerSchema } from '../../schemas/langchain-schemas.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for PlannerChain with structured output
async function createPlannerChain(llm) {
  const promptPath = path.join(__dirname, '../prompts/PlannerChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  console.debug('[PlannerChain] prompt template:', promptString);
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
      console.debug('[PlannerChain] input to prompt:', formattedInput);
      const hydratedPrompt = await plannerPrompt.format(formattedInput);
      // console.debug('[PlannerChain] hydrated prompt:', hydratedPrompt);
      
      try {
        const result = await structuredLLM.invoke(hydratedPrompt);
        console.debug('[PlannerChain] structured output:', result);
        // Extract the plan array from the wrapped object
        return result.plan || result;
      } catch (err) {
        console.error('[PlannerChain] Failed to get structured output:', err);
        throw err;
      }
    }
  };

}

export { createPlannerChain };