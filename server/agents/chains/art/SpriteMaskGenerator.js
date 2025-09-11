import { createJSONChain } from '../../../utils/chainFactory.js';
import { spriteDslSchema } from '../../../schemas/langchain-schemas.js';
import { compileSpriteDSL } from '../../../utils/sprites/dsl/compiler.js';

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

export async function createSpriteMaskGenerator(llm, options = {}) {
  if (!llm) throw new Error('createSpriteMaskGenerator requires an llm instance');
  const sharedState = options.sharedState;
  const chain = await createJSONChain({
    chainName: 'SpriteDesignChain',
    promptFile: 'art/sprite-dsl-generator.md',
    inputVariables: ['context'],
    schema: spriteDslSchema,
    llm,
    sharedState,
    enableLogging: options.enableLogging !== false
  });
  return {
    async generate(entity, opts = {}) {
      const gridSize = Number(opts.gridSize || 12) || 12;
      const context = { entity: normalizeEntity(entity), gridSize };
      const dsl = await chain.invoke({ context, traceId: opts.traceId });
      return compileSpriteDSL(dsl);
    }
  };
}

export default { createSpriteMaskGenerator };

