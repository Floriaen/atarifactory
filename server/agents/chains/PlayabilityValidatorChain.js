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

// Async factory for PlayabilityValidatorChain
async function createPlayabilityValidatorChain(llm) {
  if (!llm) throw new Error('LLM instance must be provided to createFeedbackChain');
  const promptPath = path.join(__dirname, '../prompts/PlayabilityValidatorChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const playabilityPrompt = new PromptTemplate({
    template: promptString + '\n' + formatInstructions,
    inputVariables: ['mechanics', 'winCondition']
  });
  return playabilityPrompt.pipe(llm).pipe(parser);
}

export { createPlayabilityValidatorChain };