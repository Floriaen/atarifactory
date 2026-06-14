import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { withNode } from '../observability/withNode.js';
import { parseGameDefinition, type GameDefinition } from '../contracts/gameDefinition.js';
import type { SpriteItem, SpritePack } from '../contracts/spritePack.js';
import { spriteChain } from './chains/index.js';
import { compileSprite } from './compiler.js';
import { assembleSpritePack } from './assembleSpritePack.js';

export interface ArtDeps {
  provider: LLMProvider;
  observer: Observer;
}

export interface ArtResult {
  pack: SpritePack;
}

/**
 * The art phase (mirrors `runDesignPhase`): from a validated GameDefinition,
 * generate one sprite per entity (parallel fan-out — the diverge analogue) and
 * emit a validated SpritePack. The compiler is the quality gate; there is no
 * LLM critic (sprite validity is objective).
 */
export async function runArtPhase(game: GameDefinition, deps: ArtDeps): Promise<ArtResult> {
  const { provider, observer } = deps;
  const def = parseGameDefinition(game); // read guard
  const sprite = spriteChain({ provider, observer });

  const entries = await Promise.all(
    def.entities.map((entity) =>
      withNode(observer, `sprite:${entity.id}`, async (): Promise<[string, SpriteItem]> => {
        const { data: dsl } = await sprite.run({
          entity,
          gameTitle: def.title,
          orientation: def.spatial.orientation,
        });
        const compiled = compileSprite(dsl);
        return [entity.id, { gridSize: compiled.gridSize, frames: compiled.frames, dsl }];
      }),
    ),
  );

  const pack = assembleSpritePack(Object.fromEntries(entries));
  observer.progress('done', `${def.entities.length} sprites`);
  return { pack };
}
