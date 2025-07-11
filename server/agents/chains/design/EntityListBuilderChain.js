import { createJSONChain } from '../../../utils/chainFactory.js';
import { entityListBuilderSchema } from '../../../schemas/langchain-schemas.js';

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
