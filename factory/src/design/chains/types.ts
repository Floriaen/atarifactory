import { z } from 'zod/v4';
import { GameDraft, Seed } from '@game-factory/contracts';

/** Input to one persona seed generator. The factory invents from scratch — no theme. */
export const SeedGenInput = z
  .object({
    persona: z.string().min(1),
    personaBrief: z.string().min(1),
  })
  .strict();
export type SeedGenInput = z.infer<typeof SeedGenInput>;

/** Input to the selector — seeds are pre-formatted into a list string. */
export const SelectInput = z
  .object({
    seedsList: z.string().min(1),
  })
  .strict();
export type SelectInput = z.infer<typeof SelectInput>;

/** Input to elaborate. `feedbackBlock` is '' on the first pass, populated on refine. */
export const ElaborateInput = z
  .object({
    seed: Seed,
    feedbackBlock: z.string(),
  })
  .strict();
export type ElaborateInput = z.infer<typeof ElaborateInput>;

/** Input to the critic. */
export const CriticInput = z
  .object({
    draft: GameDraft,
  })
  .strict();
export type CriticInput = z.infer<typeof CriticInput>;
