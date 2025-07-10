// Modular LangChain chain for ContextStepBuilderAgent
// Receives: { gameSource, plan, step }
// Returns: revised JavaScript source as a string

import fs from 'fs';
import path from 'path';
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  // Use the new JS prompt with system/human separation
  const parser = new StringOutputParser({
    parse: (text) => text.trim()
  });
  return prompt.pipe(llm).pipe(parser);
}

export { createContextStepBuilderChain };