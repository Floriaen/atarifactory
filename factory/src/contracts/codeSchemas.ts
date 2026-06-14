import { z } from 'zod/v4';

/**
 * Internal phase I/O for the coding phase (mirrors `phaseSchemas.ts` for design).
 * None of these is a published artifact — that is `GameBundleV1`. They are the
 * shapes the chains and the gate exchange while a game is being authored and judged.
 */

/**
 * The LLM output: the authored `game.js`. We validate only that `js` is non-empty —
 * *correctness* is the gate's job, not the schema's (you can't regex "it runs", let
 * alone "it plays").
 */
export const GameCode = z
  .object({
    js: z.string().min(1),
    summary: z.string().optional(),
  })
  .strict();
export type GameCode = z.infer<typeof GameCode>;

/** One thing the faithfulness reviewer wants changed. */
export const CodeReviewIssue = z
  .object({
    target: z.string().min(1),
    note: z.string().min(1),
  })
  .strict();
export type CodeReviewIssue = z.infer<typeof CodeReviewIssue>;

/**
 * The faithfulness reviewer's output (mirrors the design `Critique`): does the code
 * build the loop/mechanics/goal the GameDefinition describes? Skeptic by default.
 */
export const CodeReview = z
  .object({
    verdict: z.enum(['pass', 'revise']),
    issues: z.array(CodeReviewIssue),
  })
  .strict();
export type CodeReview = z.infer<typeof CodeReview>;

/** The six checks the gate reports. The first three are the hard floor; the rest are soft. */
export const CodeChecks = z
  .object({
    syntax: z.boolean(),
    lint: z.boolean(),
    smoke: z.boolean(),
    interaction: z.boolean(),
    progression: z.boolean(),
    faithful: z.boolean(),
  })
  .strict();
export type CodeChecks = z.infer<typeof CodeChecks>;

/**
 * The gate's verdict, returned by the phase. `passed` is true only when EVERY check
 * passed; `issues` collects every failing signal's message (the repair loop's fuel).
 */
export const CodeReport = z
  .object({
    passed: z.boolean(),
    checks: CodeChecks,
    issues: z.array(z.string()),
  })
  .strict();
export type CodeReport = z.infer<typeof CodeReport>;

/** Fed back into the fix chain — the union of execution-gate failures and review issues. */
export interface CodeFeedback {
  js: string;
  issues: string[];
}
