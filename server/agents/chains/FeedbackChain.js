// Modular LangChain chain for FeedbackAgent
// Receives: { runtimeLogs, stepId }
// Returns: { retryTarget: 'fixer' | 'planner', suggestion: string }

const fs = require('fs').promises;
const path = require('path');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

// Async factory for the chain
async function createFeedbackChain(llm) {
  if (!llm) throw new Error('LLM instance must be provided to createFeedbackChain');
  const promptPath = path.join(__dirname, '../prompts/FeedbackChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const fullPrompt = promptString + '\n' + formatInstructions;
  const prompt = new PromptTemplate({
    template: fullPrompt,
    inputVariables: ['runtimeLogs', 'stepId'],
  });
  return prompt.pipe(llm).pipe(parser);

}

module.exports = { createFeedbackChain };
