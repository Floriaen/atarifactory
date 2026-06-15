import { z } from 'zod/v4';
import { Entity, Orientation } from '@game-factory/contracts';

/** Input to the sprite generator — one entity at a time, with game context. */
export const SpriteGenInput = z
  .object({
    entity: Entity,
    gameTitle: z.string().min(1),
    orientation: Orientation,
  })
  .strict();
export type SpriteGenInput = z.infer<typeof SpriteGenInput>;
