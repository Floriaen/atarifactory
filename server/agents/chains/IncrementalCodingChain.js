// Modular chain built via chainFactory for the incremental coding agent
// Receives: { gameSource, plan, step, entities }
// Returns: revised JavaScript source as a string

import { createChatChain } from '../../utils/chainFactory.js';

export const CHAIN_STATUS = {
  name: 'IncrementalCodingChain',
  label: 'Code Generation',
  description: 'Implementing game logic',
  category: 'coding',
};

// Async factory for the chain
export async function createIncrementalCodingChain(llm, options = {}) {
  const chain = await createChatChain({
    chainName: 'IncrementalCodingChain',
    systemFile: 'IncrementalCodingChain.system.prompt.md',
    humanFile: 'IncrementalCodingChain.human.prompt.md',
    inputVariables: ['gameSource', 'plan', 'step', 'entities'],
    preset: 'creative',
    llm,
    sharedState: options.sharedState,
  });

  return {
    async invoke(input) {
      const safeInput = { ...input };
      if (typeof safeInput.entities === 'undefined') {
        safeInput.entities = '[]';
      }
      return chain.invoke(safeInput);
    },
  };
}

// Temporary backwards compatibility export; remove after callers migrate.
export const createContextStepBuilderChain = createIncrementalCodingChain;
