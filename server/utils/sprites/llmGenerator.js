import { ChatOpenAI } from '@langchain/openai';
import { createSpriteDesignChain } from '../../agents/chains/art/SpriteDesignChain.js';
import { compileSpriteDSL } from './dsl/compiler.js';

export async function generateMaskViaLLM(entity, opts = {}) {
  const gridSize = Number(opts.gridSize || 12) || 12;
  const model = process.env.OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !model) {
    throw new Error('OPENAI_API_KEY and OPENAI_MODEL must be set to use LLM sprite generation');
  }
  const llm = new ChatOpenAI({ modelName: model, openAIApiKey: apiKey, temperature: 0 });
  const chain = await createSpriteDesignChain(llm);
  const context = { entity: String(entity || ''), gridSize };
  const dsl = await chain.invoke({ context });
  const mask = compileSpriteDSL(dsl);
  return mask;
}

export default { generateMaskViaLLM };

