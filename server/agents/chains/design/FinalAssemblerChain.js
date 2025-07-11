import { createJSONChain } from '../../../utils/chainFactory.js';
import { finalAssemblerSchema } from '../../../schemas/langchain-schemas.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, '../../prompts/design/final-assembler.md');

async function createFinalAssemblerChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'FinalAssemblerChain',
    promptFile: 'design/final-assembler.md',
    inputVariables: ['title', 'pitch', 'loop', 'mechanics', 'winCondition', 'entities'],
    schema: finalAssemblerSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createFinalAssemblerChain };
