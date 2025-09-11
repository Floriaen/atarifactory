import { ChatOpenAI } from '@langchain/openai';
import { createSpriteDesignChain } from '../../agents/chains/art/SpriteDesignChain.js';
import { compileSpriteDSL } from './dsl/compiler.js';

function normalizeEntity(name) {
  const n = String(name || '').toLowerCase();
  const aliasGroups = [
    { key: 'plane', list: ['plane','airplane','aircraft','jet','glider'] },
    { key: 'person', list: ['person','human','man','woman','guard','hero','player'] },
    { key: 'lantern', list: ['lantern','lamp','torch'] },
    { key: 'fruit', list: ['fruit','apple','pear','cherry','banana','orange'] },
    { key: 'tree', list: ['tree','pine','fir','spruce'] },
    { key: 'car', list: ['car','vehicle','automobile'] },
    { key: 'helicopter', list: ['helicopter','chopper','heli'] }
  ];
  for (const g of aliasGroups) if (g.list.includes(n)) return g.key;
  return n;
}

export async function generateMaskViaLLM(entity, opts = {}) {
  const gridSize = Number(opts.gridSize || 12) || 12;
  const model = process.env.OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !model) {
    throw new Error('OPENAI_API_KEY and OPENAI_MODEL must be set to use LLM sprite generation');
  }
  const llm = new ChatOpenAI({ modelName: model, openAIApiKey: apiKey, temperature: 0 });
  const chain = await createSpriteDesignChain(llm);
  const context = { entity: normalizeEntity(entity), gridSize };
  const dsl = await chain.invoke({ context });
  const mask = compileSpriteDSL(dsl);
  return mask;
}

export default { generateMaskViaLLM };
