import { createCreativeChain } from '../../../utils/chainFactory.js';
import { ideaGeneratorSchema } from '../../../schemas/langchain-schemas.js';

async function createIdeaGeneratorChain(llm, options = {}) {
  return createCreativeChain({
    chainName: 'IdeaGeneratorChain',
    promptFile: 'design/idea-generator.md',
    inputVariables: ['context'],
    schema: ideaGeneratorSchema,
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createIdeaGeneratorChain };
