import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { withNode } from '../observability/withNode.js';
import { type GameDefinition } from '../contracts/gameDefinition.js';
import type { Critique, GameDraft, Seed } from '../contracts/phaseSchemas.js';
import { PERSONAS, samplePersonas, type Persona } from './personas.js';
import { criticChain, elaborateChain, seedGeneratorChain, seedSelectorChain } from './chains/index.js';
import { OPUS_MODEL } from '../llm/models.js';
import { mergeVerdict } from './critic.js';
import { assembleGameDefinition } from './assembleGameDefinition.js';
import { DEFAULT_LOOP, decide, formatFeedback, formatSeeds, type LoopConfig } from './refinementRouter.js';

export interface DesignDeps {
  provider: LLMProvider;
  observer: Observer;
  /** Override for determinism in tests; otherwise sampled from the pool. */
  personas?: Persona[];
  numSeeds?: number;
  loop?: Partial<LoopConfig>;
}

export interface DesignResult {
  game: GameDefinition;
  critique: Critique;
  iterations: number;
  chosen: Seed;
}

export async function runDesignPhase(deps: DesignDeps): Promise<DesignResult> {
  const { provider, observer } = deps;
  const personas = deps.personas ?? samplePersonas(deps.numSeeds ?? 5, PERSONAS);
  const loop: LoopConfig = { ...DEFAULT_LOOP, ...deps.loop };

  const seedGen = seedGeneratorChain({ provider, observer });
  const selector = seedSelectorChain({ provider, observer });
  const elaborate = elaborateChain({ provider, observer });
  // Judgment quality matters most here — override the (Sonnet) validation preset to Opus.
  const critic = criticChain({ provider, observer, modelOverride: { model: OPUS_MODEL, effort: 'medium' } });

  // 1 — DIVERGE (parallel persona generators)
  const seeds: Seed[] = await withNode(observer, 'diverge', () =>
    Promise.all(
      personas.map((p) =>
        seedGen.run({ persona: p.name, personaBrief: p.brief }).then((r) => r.data),
      ),
    ),
  );

  // 2 — SELECT (rank against each other)
  const selection = await withNode(observer, 'select', () =>
    selector.run({ seedsList: formatSeeds(seeds) }).then((r) => r.data),
  );
  const chosen = seeds[Math.min(selection.chosenIndex, seeds.length - 1)] ?? seeds[0];
  if (!chosen) throw new Error('runDesignPhase: no seeds were generated');

  // 3 — ELABORATE + 4 — CRITIC (bounded refinement loop)
  let draft: GameDraft = await withNode(observer, 'elaborate', () =>
    elaborate.run({ seed: chosen, feedbackBlock: '' }).then((r) => r.data),
  );

  let critique: Critique;
  let iteration = 0;
  for (;;) {
    const node = iteration === 0 ? 'critic' : `critic#${iteration}`;
    const llm = await withNode(observer, node, () => critic.run({ draft }).then((r) => r.data));
    critique = mergeVerdict(draft, llm);

    const decision = decide(critique, iteration, loop);
    if (decision.action === 'accept') break;

    iteration += 1;
    const feedback = formatFeedback(critique);
    draft = await withNode(observer, `elaborate#${iteration}`, () =>
      elaborate.run({ seed: chosen, feedbackBlock: feedback }).then((r) => r.data),
    );
  }

  // 5 — ASSEMBLE (deterministic write boundary)
  const game = assembleGameDefinition(draft);
  observer.progress('done', game.title);

  return { game, critique, iterations: iteration, chosen };
}
