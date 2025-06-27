const fs = require('fs/promises');
const path = require('path');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { ChatOpenAI } = require('@langchain/openai');

// Async factory for PlayabilityValidatorChain
async function createPlayabilityValidatorChain(llm) {
  if (!llm) throw new Error('LLM instance must be provided to createFeedbackChain');
  const promptPath = path.join(__dirname, '../prompts/PlayabilityValidatorChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const playabilityPrompt = new PromptTemplate({
    template: promptString + '\n' + formatInstructions,
    inputVariables: ['mechanics', 'winCondition']
  });
  return playabilityPrompt.pipe(llm).pipe(parser);
}

module.exports = { createPlayabilityValidatorChain };