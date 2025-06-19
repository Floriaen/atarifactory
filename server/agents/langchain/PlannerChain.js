const fs = require("fs/promises");
const path = require("path");
const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

// Async factory for PlannerChain
async function createPlannerChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 })) {
  const promptPath = path.join(__dirname, "../prompts/PlannerAgent.prompt.md");
  const promptString = await fs.readFile(promptPath, "utf8");
  const plannerPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ["gameDefinition"]
  });
  const parser = new JsonOutputParser();
  return plannerPrompt.pipe(llm).pipe(parser);
}

module.exports = { createPlannerChain };
