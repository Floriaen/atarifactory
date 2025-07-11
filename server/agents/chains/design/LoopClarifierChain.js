import { createJSONChain } from '../../../utils/chainFactory.js';
import { loopClarifierSchema } from '../../../schemas/langchain-schemas.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/loop-clarifier.md');

async function createLoopClarifierChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'LoopClarifierChain',
    promptFile: 'design/loop-clarifier.md',
    inputVariables: ['title', 'pitch'],
    schema: loopClarifierSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createLoopClarifierChain };
