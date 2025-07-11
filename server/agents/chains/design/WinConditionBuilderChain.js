import { createJSONChain } from '../../../utils/chainFactory.js';
import { winConditionBuilderSchema } from '../../../schemas/langchain-schemas.js';

async function createWinConditionBuilderChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'WinConditionBuilderChain',
    promptFile: 'design/win-condition-builder.md',
    inputVariables: ['mechanics'],
    schema: winConditionBuilderSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createWinConditionBuilderChain };