const fs = require('fs/promises');
const path = require('path');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { ChatOpenAI } = require('@langchain/openai');

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

module.exports = { createPlannerChain };