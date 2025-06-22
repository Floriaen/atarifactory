// Modular GameInventorChain (Runnable API)
const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const path = require('path');
const fs = require('fs').promises;

// Async factory that loads the prompt template from a file and constructs a PromptTemplate
async function createGameInventorChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 })) {
  const promptPath = path.join(__dirname, '../prompts/GameInventorChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const gameInventorPrompt = new PromptTemplate({ template: promptString, inputVariables: [] });
  const parser = new JsonOutputParser();
  return gameInventorPrompt.pipe(llm).pipe(parser);
}

/*
// Usage example:
(async () => {
  const chain = await createGameInventorChain();
  const result = await chain.invoke({ title: "Platformer" });
  console.log(result);
})();
*/

module.exports = { createGameInventorChain };
