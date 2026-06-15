import { parseSpritePack, type SpriteItem, type SpritePack } from '@game-factory/contracts';

/**
 * The WRITE boundary: deterministic, no LLM. Normalization already happened in
 * the compiler; this only assembles the keyed items, stamps the version/time,
 * and validates against the contract (fail loud). `EntityId` keys are already
 * code-ready, so they are reused verbatim — no key normalization.
 */
export function assembleSpritePack(items: Record<string, SpriteItem>): SpritePack {
  return parseSpritePack({
    schemaVersion: 'spritepack/v1',
    generatedAt: new Date().toISOString(),
    items,
  });
}
