import { createValidationChain } from '../../../utils/chainFactory.js';
import { playabilityHeuristicSchema } from '../../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'PlayabilityHeuristicChain',
  label: 'Playability Heuristic',
  description: 'Scoring game playability',
  category: 'planning'
};

async function createPlayabilityHeuristicChain(llm, options = {}) {
  return createValidationChain({
    chainName: 'PlayabilityHeuristicChain',
    promptFile: 'design/playability-heuristic.md',
    inputVariables: ['context'],
    schema: playabilityHeuristicSchema,
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createPlayabilityHeuristicChain };
