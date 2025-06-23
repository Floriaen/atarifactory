import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.js';

function createWinConditionBuilderChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/win-condition-builder.md');
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['mechanics'],
    schemaName: 'winCondition string'
  });
}

export { createWinConditionBuilderChain };
export const WinConditionBuilderChain = { invoke: async (input) => createWinConditionBuilderChain().invoke(input) };
