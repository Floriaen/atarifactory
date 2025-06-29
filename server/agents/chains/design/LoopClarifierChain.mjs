import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/loop-clarifier.md');

function createLoopClarifierChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['title', 'pitch'],
    schemaName: 'loop string',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createLoopClarifierChain };
