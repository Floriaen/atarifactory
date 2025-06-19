// Modular LangChain chain for FeedbackAgent
// Receives: { runtimeLogs, stepId }
// Returns: { retryTarget: 'fixer' | 'planner', suggestion: string }

const fs = require('fs').promises;
const path = require('path');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ChatOpenAI } = require('@langchain/openai');

// Async factory for the chain
async function createFeedbackChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 })) {
  const promptPath = path.join(__dirname, '../prompts/FeedbackChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const prompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['runtimeLogs', 'stepId'],
  });
  const parser = new StringOutputParser();
  return prompt.pipe(llm).pipe(parser);
}

module.exports = { createFeedbackChain };
