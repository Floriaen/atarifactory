import type { GameDraft } from '../contracts/phaseSchemas.js';
import { parseGameDefinition, type GameDefinition } from '../contracts/gameDefinition.js';

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
