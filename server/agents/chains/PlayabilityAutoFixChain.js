import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for PlayabilityAutoFixChain
async function createPlayabilityAutoFixChain(llm) {
  const promptPath = path.join(__dirname, '../prompts/PlayabilityAutoFixChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const autoFixPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['gameDef', 'suggestion']
  });
  const parser = new JsonOutputParser();
  return autoFixPrompt.pipe(llm).pipe(parser);
}

export { createPlayabilityAutoFixChain };
