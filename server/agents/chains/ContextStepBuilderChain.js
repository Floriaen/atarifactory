// Modular LangChain chain for ContextStepBuilderAgent
// Receives: { gameSource, plan, step }
// Returns: revised JavaScript source as a string

const prompt = require('../prompts/ContextStepBuilderChain.prompt.js');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ChatOpenAI } = require('@langchain/openai');

// Async factory for the chain
async function createContextStepBuilderChain(llm) {
  if (!llm) llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 });
  // Use the new JS prompt with system/human separation
  const parser = new StringOutputParser({
    parse: (text) => text.trim()
  });
  return prompt.pipe(llm).pipe(parser);
}

module.exports = { createContextStepBuilderChain };