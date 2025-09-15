import { createStandardChain } from '../../../utils/chainFactory.js';
import { backgroundCodeSchema } from '../../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'BackgroundCodeChain',
  label: 'Background Code',
  description: 'Generating Atari-style background code',
  category: 'coding'
};

async function createBackgroundCodeChain(llm, options = {}) {
  return await createStandardChain({
    chainName: 'BackgroundCodeChain',
    promptFile: 'coding/background-code.md',
    inputVariables: ['context'],
    schema: backgroundCodeSchema,
    preset: 'structured',
    llm,
    sharedState: options.sharedState
  });
}

export { createBackgroundCodeChain };

