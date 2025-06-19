const fs = require("fs/promises");
const path = require("path");
const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

// Async factory for PlayabilityValidatorChain
async function createPlayabilityValidatorChain(llm = new ChatOpenAI({ temperature: 0 })) {
  const promptPath = path.join(__dirname, "../prompts/PlayabilityValidatorAgent.prompt.md");
  const promptString = await fs.readFile(promptPath, "utf8");
  const playabilityPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ["mechanics", "winCondition"]
  });
  const parser = new JsonOutputParser();
  return playabilityPrompt.pipe(llm).pipe(parser);
}

module.exports = { createPlayabilityValidatorChain };
