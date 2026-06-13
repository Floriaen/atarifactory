import type { Critique } from '../contracts/phaseSchemas.js';

export interface LoopConfig {
  maxIterations: number;
}

export const DEFAULT_LOOP: LoopConfig = { maxIterations: 2 };

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

/** Render critic issues into a feedback block injected back into elaborate. */
export function formatFeedback(critique: Critique): string {
  const lines = critique.issues.map((i) => `- [${i.severity}] ${i.target}: ${i.note}`);
  const resembles = critique.resembles ? `\nToo close to "${critique.resembles}" — differentiate the hook, goal, or verb.` : '';
  return `\nA previous version had these issues — fix them:\n${lines.join('\n')}${resembles}\n`;
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
