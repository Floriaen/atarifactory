import type { Critique, GameDraft } from '../contracts/phaseSchemas.js';

/**
 * Deterministic hard rules merged over the LLM critique. The model names the
 * closest classic and judges fun; the rules guarantee a `revise` whenever a
 * high-severity issue exists, so a sycophantic "pass" can't override real flaws.
 */
export function mergeVerdict(_draft: GameDraft, llm: Critique): Critique {
  const hasHigh = llm.issues.some((i) => i.severity === 'high');
  const verdict: Critique['verdict'] = hasHigh ? 'revise' : llm.verdict;
  return { ...llm, verdict };
}
