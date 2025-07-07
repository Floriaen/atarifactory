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
  const fs = await import('fs');
  const path = await import('path');
  const promptPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../prompts/ControlBarTransformerAgent.prompt.md');
  const promptTemplate = fs.readFileSync(promptPath, 'utf8');
  const prompt = promptTemplate.replace('{{gameSource}}', sharedState.gameSource);
  const result = await llm.invoke(prompt);
  // Try to extract code block if present, else return raw
  const match = result.content.match(/```(?:js|javascript)?\n([\s\S]*?)```/i);
  return match ? match[1].trim() : result.content.trim();
}

