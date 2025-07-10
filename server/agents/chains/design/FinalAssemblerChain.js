import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, '../../prompts/design/final-assembler.md');

function createFinalAssemblerChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['title', 'pitch', 'loop', 'mechanics', 'winCondition', 'entities'],
    schemaName: 'gameDef object',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createFinalAssemblerChain };
