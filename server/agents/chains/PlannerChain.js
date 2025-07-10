import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for PlannerChain
async function createPlannerChain(llm) {
  const promptPath = path.join(__dirname, '../prompts/PlannerChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  console.debug('[PlannerChain] prompt template:', promptString);
  const plannerPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['gameDefinition']
  });
  const parser = new JsonOutputParser();

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
      const llmResult = await llm.invoke(hydratedPrompt);
      console.debug('[PlannerChain] raw LLM output:', llmResult);
      try {
        return parser.invoke(llmResult);
      } catch (err) {
        console.error('[PlannerChain] Failed to parse LLM output as JSON:', llmResult, err);
        throw err;
      }
    }
  };

}

export { createPlannerChain };