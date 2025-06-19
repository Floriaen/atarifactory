const fs = require("fs/promises");
const path = require("path");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

// Async factory for StepFixerChain
async function createStepFixerChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 })) {
  const promptPath = path.join(__dirname, "../prompts/StepFixerAgent.prompt.md");
  const promptString = await fs.readFile(promptPath, "utf8");
  const fixerPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ["currentCode", "step", "errorList"]
  });
  const parser = new StringOutputParser();
  return fixerPrompt.pipe(llm).pipe(parser);
}

module.exports = { createStepFixerChain };
