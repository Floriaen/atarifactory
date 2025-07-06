// Modular LangChain chain for ContextStepBuilderAgent
// Receives: { gameSource, plan, step }
// Returns: revised JavaScript source as a string

const fs = require('fs');
const path = require('path');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ChatOpenAI } = require('@langchain/openai');

// Load system and human prompt templates from .md files
function loadPromptTemplate(filename) {
  return fs.readFileSync(path.join(__dirname, '../prompts', filename), 'utf8');
}

const systemTemplate = loadPromptTemplate('ContextStepBuilderChain.system.prompt.md');
const humanTemplate = loadPromptTemplate('ContextStepBuilderChain.human.prompt.md');

const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(systemTemplate),
  HumanMessagePromptTemplate.fromTemplate(humanTemplate)
]);

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