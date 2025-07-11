import { createJSONChain } from '../../../utils/chainFactory.js';
import { entityListBuilderSchema } from '../../../schemas/langchain-schemas.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/entity-list-builder.md');

async function createEntityListBuilderChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'EntityListBuilderChain',
    promptFile: 'design/entity-list-builder.md',
    inputVariables: ['mechanics', 'loop', 'winCondition'],
    schema: entityListBuilderSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createEntityListBuilderChain };
