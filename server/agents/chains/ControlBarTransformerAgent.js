import { createStandardChain } from '../../utils/chainFactory.js';
import { createStandardLLM } from '../../config/langchain.config.js';

/**
 * Create a ControlBarTransformerAgent chain that converts game code to use control bar input
 * 
 * @param {object} llm - LLM instance (optional, will create default if not provided)
 * @param {object} options - Chain options
 * @param {object} options.sharedState - Shared state for token counting
 * @returns {Promise<Object>} - A chain that transforms game code
 */
async function createControlBarTransformerChain(llm, options = {}) {
  const { sharedState } = options;
  
  return await createStandardChain({
    chainName: 'ControlBarTransformerAgent',
    promptFile: 'ControlBarTransformerAgent.prompt.md',
    inputVariables: ['gameSource'],
    preset: 'creative', // Use creative preset for code transformation
    llm: llm || createStandardLLM(),
    sharedState,
    // No schema - we want raw text output for code transformation
    customInvoke: async (input, baseChain, { chainName, enableLogging }) => {
      // Input validation
      if (!input || typeof input.gameSource !== 'string') {
        throw new Error('Input must have gameSource as string');
      }
      
      if (enableLogging) {
        console.debug(`[${chainName}] Invoking with input:`, input);
      }
      
      // Call the base chain
      const result = await baseChain.invoke(input);
      
      // Transform output: Extract code block if present, else return raw content
      const content = result.content || result;
      const match = content.match(/```(?:js|javascript)?\n([\s\S]*?)```/i);
      const transformedResult = match ? match[1].trim() : content.trim();
      
      if (enableLogging) {
        console.debug(`[${chainName}] Successfully completed`);
      }
      
      return transformedResult;
    }
  });
}

/**
 * LLM-based transformer for game.js input code. Loads its prompt from
 * server/agents/prompts/ControlBarTransformerAgent.prompt.md.
 *
 * @param {object} sharedState - The full pipeline shared context (must include gameSource as string)
 * @param {object} llm - An LLM instance (required)
 * @returns {Promise<string>} - The revised JS code as a string
 * @throws if llm is missing or sharedState.gameSource is invalid
 */
export async function transformGameCodeWithLLM(sharedState, llm) {
  if (!llm) throw new Error('No LLM instance provided. Pass llm as the second argument.');
  if (!sharedState || typeof sharedState.gameSource !== 'string') {
    throw new Error('sharedState must be an object with a gameSource string');
  }
  
  // Create the chain and invoke it
  const chain = await createControlBarTransformerChain(llm, { sharedState });
  const result = await chain.invoke({ gameSource: sharedState.gameSource });
  
  console.log('ControlBarTransformerAgent result', result);
  return result;
}

export { createControlBarTransformerChain };

