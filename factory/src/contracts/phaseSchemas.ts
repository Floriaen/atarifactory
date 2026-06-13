import { z } from 'zod/v4';
import { Entity, Goal, Mechanic, Orientation } from './gameDefinition.js';

/** Maps 1:1 to Goal.type — chosen at seed time before the full goal is fleshed out. */
export const GoalMode = z.enum(['survive', 'score', 'reach', 'clear']);
export type GoalMode = z.infer<typeof GoalMode>;

/** Output of one persona generator (step 1, diverge). */
export const Seed = z
  .object({
    coreVerb: z.string().min(1),
    hook: z.string().min(1),
    goalMode: GoalMode,
    whyFun: z.string().min(1),
    persona: z.string().min(1),
  })
  .strict();
export type Seed = z.infer<typeof Seed>;

/** Output of the selector (step 2, rank). */
export const Selection = z
  .object({
    chosenIndex: z.number().int().min(0),
    reason: z.string().min(1),
  })
  .strict();
export type Selection = z.infer<typeof Selection>;

/** Output of elaborate (step 3). A draft that assembleGameDefinition turns into a GameDefinition. */
export const GameDraft = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    coreVerb: z.string().min(1),
    hook: z.string().min(1),
    loop: z.string().min(1),
    mechanics: z.array(Mechanic).min(1).max(2),
    entities: z.array(Entity).min(1).max(3),
    goal: Goal,
    controls: z.string().min(1),
    orientation: Orientation,
    estimatedPlaytimeSec: z.number().int().positive(),
  })
  .strict();
export type GameDraft = z.infer<typeof GameDraft>;

export const IssueTarget = z.enum(['hook', 'loop', 'mechanics', 'entities', 'goal', 'title']);

/** Output of the critic (step 4, LLM part). Merged with deterministic hard rules. */
export const Critique = z
  .object({
    verdict: z.enum(['pass', 'revise']),
    resembles: z.string(),
    funNote: z.string(),
    issues: z.array(
      z
        .object({
          target: IssueTarget,
          severity: z.enum(['low', 'medium', 'high']),
          note: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();
export type Critique = z.infer<typeof Critique>;
