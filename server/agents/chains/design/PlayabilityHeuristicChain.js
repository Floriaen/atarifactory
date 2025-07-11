import { createValidationChain } from '../../../utils/chainFactory.js';
import { playabilityHeuristicSchema } from '../../../schemas/langchain-schemas.js';

async function createPlayabilityHeuristicChain(llm, options = {}) {
  return createValidationChain({
    chainName: 'PlayabilityHeuristicChain',
    promptFile: 'design/playability-heuristic.md',
    inputVariables: ['gameDef'],
    schema: playabilityHeuristicSchema,
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createPlayabilityHeuristicChain };
