// Modernized GameInventorChain using standardized chain factory
import { ChatOpenAI } from '@langchain/openai';
import { createCreativeChain } from '../../utils/chainFactory.js';
import { gameInventorSchema } from '../../schemas/langchain-schemas.js';

// Standardized async factory that supports both old and new calling patterns
async function createGameInventorChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL, temperature: 0 }), options = {}) {
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

/*
// Usage example:
(async () => {
  const chain = await createGameInventorChain();
  const result = await chain.invoke({ title: "Platformer" });
  console.log(result);
})();
*/

export { createGameInventorChain };
