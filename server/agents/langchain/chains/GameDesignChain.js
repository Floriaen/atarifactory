const fs = require("fs/promises");
const path = require("path");
const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

// Async factory for GameDesignChain
async function createGameDesignChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 })) {
  const promptPath = path.join(__dirname, "../prompts/GameDesignChain.prompt.md");
  const promptString = await fs.readFile(promptPath, "utf8");
  const gameDesignPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ["name", "description"]
  });
  const parser = new JsonOutputParser();
  return gameDesignPrompt.pipe(llm).pipe(parser);
}

module.exports = { createGameDesignChain };
