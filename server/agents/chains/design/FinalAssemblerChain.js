import { createJSONChain } from '../../../utils/chainFactory.js';
import { finalAssemblerSchema } from '../../../schemas/langchain-schemas.js';

async function createFinalAssemblerChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'FinalAssemblerChain',
    promptFile: 'design/final-assembler.md',
    inputVariables: ['title', 'pitch', 'loop', 'mechanics', 'winCondition', 'entities'],
    schema: finalAssemblerSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createFinalAssemblerChain };
