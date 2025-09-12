// Modular chain built via chainFactory for ContextStepBuilderAgent
// Receives: { gameSource, plan, step, entities }
// Returns: revised JavaScript source as a string

import { createChatChain } from '../../utils/chainFactory.js';

export const CHAIN_STATUS = {
  name: 'ContextStepBuilderChain',
  label: 'Code Generation',
  description: 'Implementing game logic',
  category: 'coding',
};

// Async factory for the chain
export async function createContextStepBuilderChain(llm, options = {}) {
  const chain = await createChatChain({
    chainName: 'ContextStepBuilderChain',
    systemFile: 'ContextStepBuilderChain.system.prompt.md',
    humanFile: 'ContextStepBuilderChain.human.prompt.md',
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
