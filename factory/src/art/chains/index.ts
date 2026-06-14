import { defineChain } from '../../llm/chain.js';
import { SpriteDsl } from '../../contracts/artSchemas.js';
import { SpriteGenInput } from './types.js';

/**
 * Reuse the `structured` preset (Sonnet/medium): this is constrained output,
 * not ideation. Override to Opus at the call site only if live runs show poor
 * silhouettes.
 */
export const spriteChain = defineChain({
  name: 'sprite',
  promptFile: 'prompts/art/sprite.prompt.md',
  inputSchema: SpriteGenInput,
  outputSchema: SpriteDsl,
  preset: 'structured',
});
