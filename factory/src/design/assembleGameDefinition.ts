import type { GameDraft } from '@game-factory/contracts';
import { parseGameDefinition, type GameDefinition } from '@game-factory/contracts';

/**
 * The WRITE boundary: deterministic, no LLM. All normalization happens here,
 * exactly once, then the result is validated against the contract (fail loud).
 */
export function assembleGameDefinition(draft: GameDraft): GameDefinition {
  return parseGameDefinition({
    schemaVersion: 'gamedef/v1',
    title: draft.title,
    description: draft.description,
    coreVerb: draft.coreVerb,
    hook: draft.hook,
    loop: draft.loop,
    mechanics: draft.mechanics,
    entities: draft.entities,
    goal: draft.goal,
    controls: draft.controls,
    spatial: { usesFullScreen: true, orientation: draft.orientation },
    estimatedPlaytimeSec: draft.estimatedPlaytimeSec,
  });
}
