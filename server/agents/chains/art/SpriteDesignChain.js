import { createJSONChain } from '../../../utils/chainFactory.js';
import { z } from 'zod';

export const spriteDslZod = z.object({
  gridSize: z.number().int().min(8).max(32).default(12),
  frames: z.array(z.object({ ops: z.array(z.string().min(1)) })).min(1).max(3),
  meta: z.object({ entity: z.string().min(1) })
});

async function createSpriteDesignChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'SpriteDesignChain',
    promptFile: 'art/sprite-dsl-generator.md',
    inputVariables: ['context'],
    schema: spriteDslZod,
    llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createSpriteDesignChain };
