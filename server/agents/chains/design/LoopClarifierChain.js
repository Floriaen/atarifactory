import { createJSONChain } from '../../../utils/chainFactory.js';
import { loopClarifierSchema } from '../../../schemas/langchain-schemas.js';

async function createLoopClarifierChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'LoopClarifierChain',
    promptFile: 'design/loop-clarifier.md',
    inputVariables: ['context'],
    schema: loopClarifierSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createLoopClarifierChain };
