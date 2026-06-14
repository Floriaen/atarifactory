import { z } from 'zod/v4';
import { GameDefinitionV1 } from '../../contracts/gameDefinition.js';

/**
 * Chain inputs for the coding phase. The typed `game` is passed through; the prompt
 * renderer stringifies it (the M1/M2 pattern — no capsule). `spriteNames` are the
 * canonical entity ids the model must use verbatim in `renderEntity`.
 */
export const CodeGenInput = z
  .object({
    game: GameDefinitionV1,
    spriteNames: z.array(z.string()).min(1),
    runtimeContract: z.string().min(1),
  })
  .strict();
export type CodeGenInput = z.infer<typeof CodeGenInput>;

/** Input to the fix chain — the prior `game.js` plus the concrete issues to address. */
export const CodeFixInput = z
  .object({
    game: GameDefinitionV1,
    priorJs: z.string().min(1),
    issues: z.string().min(1),
  })
  .strict();
export type CodeFixInput = z.infer<typeof CodeFixInput>;

/** Input to the faithfulness reviewer — the game spec and the code under judgement. */
export const CodeReviewInput = z
  .object({
    game: GameDefinitionV1,
    js: z.string().min(1),
  })
  .strict();
export type CodeReviewInput = z.infer<typeof CodeReviewInput>;
