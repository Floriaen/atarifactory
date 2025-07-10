// Modular LangChain chain for FeedbackAgent
// Receives: { runtimeLogs, stepId }
// Returns: { retryTarget: 'fixer' | 'planner', suggestion: string }

import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for the chain
async function createFeedbackChain(llm) {
  if (!llm) throw new Error('LLM instance must be provided to createFeedbackChain');
  const promptPath = path.join(__dirname, '../prompts/FeedbackChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const fullPrompt = promptString + '\n' + formatInstructions;
  const prompt = new PromptTemplate({
    template: fullPrompt,
    inputVariables: ['runtimeLogs', 'stepId'],
  });
  return prompt.pipe(llm).pipe(parser);

}

export { createFeedbackChain };
