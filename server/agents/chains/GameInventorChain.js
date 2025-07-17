// Modernized GameInventorChain using standardized chain factory
import { createCreativeChain } from '../../utils/chainFactory.js';
import { gameInventorSchema } from '../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'GameInventorChain',
  label: 'Game Inventor',
  description: 'Generating initial game idea',
  category: 'planning'
};

// Standardized async factory that supports both old and new calling patterns
async function createGameInventorChain(llm, options = {}) {
  return createCreativeChain({
    chainName: 'GameInventorChain',
    promptFile: 'GameInventorChain.prompt.md',
    inputVariables: [],
    schema: gameInventorSchema,
    llm: llm, // Use provided LLM for backward compatibility
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createGameInventorChain };
