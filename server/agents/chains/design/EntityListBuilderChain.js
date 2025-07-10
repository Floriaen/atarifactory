import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/entity-list-builder.md');

function createEntityListBuilderChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['mechanics', 'loop', 'winCondition'],
    schemaName: 'entities array',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createEntityListBuilderChain };
