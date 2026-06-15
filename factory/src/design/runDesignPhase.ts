import type { LLMProvider } from '../llm/provider.js';
import type { Observer } from '../observability/observer.js';
import { withNode } from '../observability/withNode.js';
import { type GameDefinition } from '@game-factory/contracts';
import type { Critique, GameDraft, Seed } from '@game-factory/contracts';
import { PERSONAS, samplePersonas, type Persona } from './personas.js';
import { criticChain, elaborateChain, seedGeneratorChain, seedSelectorChain } from './chains/index.js';
import { OPUS_MODEL, type ModelConfig } from '../llm/models.js';
import { mergeVerdict } from './critic.js';
import { assembleGameDefinition } from './assembleGameDefinition.js';
import { DEFAULT_LOOP, candidateScore, decide, formatFeedback, formatSeeds, normalizeRanking, type LoopConfig } from './refinementRouter.js';

export interface DesignDeps {
  provider: LLMProvider;
  observer: Observer;
  /** Override for determinism in tests; otherwise sampled from the pool. */
  personas?: Persona[];
  numSeeds?: number;
  loop?: Partial<LoopConfig>;
  /** Generic, host-driven model override applied to every chain (e.g. force a tier). */
  modelOverride?: Partial<ModelConfig>;
  /** Host cancellation, threaded into every chain's LLM call (abort-on-disconnect). */
  signal?: AbortSignal;
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

  const mo = deps.modelOverride;
  const signal = deps.signal;
  const seedGen = seedGeneratorChain({ provider, observer, modelOverride: mo, signal });
  const selector = seedSelectorChain({ provider, observer, modelOverride: mo, signal });
  const elaborate = elaborateChain({ provider, observer, modelOverride: mo, signal });
  // Judgment quality matters most here — default the (Sonnet) validation preset to Opus,
  // unless the host has explicitly chosen a model tier (its choice wins).
  const critic = criticChain({ provider, observer, modelOverride: mo ?? { model: OPUS_MODEL, effort: 'medium' }, signal });

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
  const ranking = normalizeRanking(selection.ranking, seeds.length);

  // 3 — ELABORATE + 4 — CRITIC, per seed. Refine a seed up to maxIterations; if it
  // still can't pass, fall back to the next-best seed. Keep the least-bad candidate.
  type Candidate = { draft: GameDraft; critique: Critique; iterations: number; chosen: Seed };

  const refineSeed = async (chosen: Seed, tag: string): Promise<Candidate> => {
    let draft = await withNode(observer, `elaborate${tag}`, () =>
      elaborate.run({ seed: chosen, feedbackBlock: '' }).then((r) => r.data),
    );
    let iteration = 0;
    for (;;) {
      const node = `critic${tag}${iteration === 0 ? '' : `#${iteration}`}`;
      const llm = await withNode(observer, node, () => critic.run({ draft }).then((r) => r.data));
      const critique = mergeVerdict(draft, llm);

      if (decide(critique, iteration, loop).action === 'accept') {
        return { draft, critique, iterations: iteration, chosen };
      }
      iteration += 1;
      const feedback = formatFeedback(critique, draft);
      draft = await withNode(observer, `elaborate${tag}#${iteration}`, () =>
        elaborate.run({ seed: chosen, feedbackBlock: feedback }).then((r) => r.data),
      );
    }
  };

  let best: Candidate | undefined;
  const seedBudget = Math.min(loop.maxSeeds, ranking.length);
  for (let s = 0; s < seedBudget; s++) {
    const seedIdx = ranking[s]!;
    const candidate = await refineSeed(seeds[seedIdx]!, s === 0 ? '' : `@s${s}`);
    if (!best || candidateScore(candidate.critique) < candidateScore(best.critique)) best = candidate;
    if (candidate.critique.verdict === 'pass') break; // a clean pass ends the search
  }
  if (!best) throw new Error('runDesignPhase: no candidate produced');

  // 5 — ASSEMBLE (deterministic write boundary)
  const game = assembleGameDefinition(best.draft);
  observer.progress('done', game.title);

  return { game, critique: best.critique, iterations: best.iterations, chosen: best.chosen };
}
