import type { Critique, GameDraft } from '@game-factory/contracts';

export interface LoopConfig {
  /** Refinement attempts on a single seed before giving up on it. */
  maxIterations: number;
  /** Seeds to try (best-first) before force-accepting the least-bad candidate. */
  maxSeeds: number;
}

export const DEFAULT_LOOP: LoopConfig = { maxIterations: 2, maxSeeds: 2 };

export type Decision =
  | { action: 'accept' }
  | { action: 'revise'; targets: string[] };

/** Accept on pass or once the iteration budget is spent (force-accept). */
export function decide(critique: Critique, iteration: number, cfg: LoopConfig): Decision {
  if (critique.verdict === 'pass') return { action: 'accept' };
  if (iteration >= cfg.maxIterations) return { action: 'accept' };
  const targets = [...new Set(critique.issues.map((i) => i.target))];
  return { action: 'revise', targets };
}

/**
 * Render the prior draft + its critique into a feedback block injected back into
 * elaborate. Carrying the draft makes the next pass a targeted REVISION (fix the
 * flagged parts, keep what works) rather than a fresh regeneration from the seed.
 */
export function formatFeedback(critique: Critique, prior: GameDraft): string {
  const lines = critique.issues.map((i) => `- [${i.severity}] ${i.target}: ${i.note}`);
  const resembles = critique.resembles ? `\nToo close to "${critique.resembles}" — differentiate the hook, goal, or verb.` : '';
  return [
    '\nREVISE your previous attempt below — fix the listed issues, keep what already works. Do not start over.',
    '\nPrevious attempt:',
    JSON.stringify(prior, null, 2),
    '\nIssues to fix:',
    lines.join('\n') + resembles,
    '',
  ].join('\n');
}

/**
 * Lower is better: a `pass` beats any `revise`; among revises, fewer high-severity
 * issues wins, then fewer issues overall. Used to keep the least-bad candidate when
 * no seed reaches a clean pass.
 */
export function candidateScore(critique: Critique): number {
  const high = critique.issues.filter((i) => i.severity === 'high').length;
  const pass = critique.verdict === 'pass' ? 0 : 1;
  return pass * 1000 + high * 100 + critique.issues.length;
}

/** De-duplicate ranking, drop out-of-range indices, and append any seeds the LLM omitted. */
export function normalizeRanking(ranking: number[], count: number): number[] {
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const i of ranking) {
    if (i >= 0 && i < count && !seen.has(i)) {
      seen.add(i);
      ordered.push(i);
    }
  }
  for (let i = 0; i < count; i++) if (!seen.has(i)) ordered.push(i);
  return ordered;
}

/** Format seeds for the selector prompt (index : compact seed). */
export function formatSeeds(seeds: { coreVerb: string; hook: string; goalMode: string; whyFun: string; persona: string }[]): string {
  return seeds
    .map(
      (s, i) =>
        `${i}: verb="${s.coreVerb}" hook="${s.hook}" goal=${s.goalMode} persona=${s.persona} — ${s.whyFun}`,
    )
    .join('\n');
}
