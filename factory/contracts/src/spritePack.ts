import { z } from 'zod/v4';
import { EntityId } from './gameDefinition.js';
import { SpriteDsl } from './artSchemas.js';

/** A boolean pixel mask, indexed `[y][x]`. */
export const SpriteMask = z.array(z.array(z.boolean()));
export type SpriteMask = z.infer<typeof SpriteMask>;

/**
 * One entity's rendered sprite. The compiled masks plus the raw `dsl` that
 * produced them — retained so a viewer can re-render without the LLM (cheap,
 * self-describing). `superRefine` enforces that every frame is exactly
 * gridSize × gridSize and has ≥1 pixel set, so M3's renderer never gets an
 * empty or mis-sized mask.
 */
export const SpriteItem = z
  .object({
    gridSize: z.number().int().min(8).max(32),
    frames: z.array(SpriteMask).min(1).max(3),
    dsl: SpriteDsl,
  })
  .strict()
  .superRefine((item, ctx) => {
    item.frames.forEach((frame, fi) => {
      if (frame.length !== item.gridSize) {
        ctx.addIssue({
          code: 'custom',
          message: `frame ${fi} must have ${item.gridSize} rows, got ${frame.length}`,
          path: ['frames', fi],
        });
        return;
      }
      let anyPixel = false;
      frame.forEach((row, ri) => {
        if (row.length !== item.gridSize) {
          ctx.addIssue({
            code: 'custom',
            message: `frame ${fi} row ${ri} must have ${item.gridSize} cols, got ${row.length}`,
            path: ['frames', fi, ri],
          });
        }
        if (row.some(Boolean)) anyPixel = true;
      });
      if (!anyPixel) {
        ctx.addIssue({
          code: 'custom',
          message: `frame ${fi} must have at least one pixel set`,
          path: ['frames', fi],
        });
      }
    });
  });
export type SpriteItem = z.infer<typeof SpriteItem>;

/** The single artifact crossing the art→coding (M2→M3) boundary. */
export const SpritePackV1 = z
  .object({
    schemaVersion: z.literal('spritepack/v1'),
    generatedAt: z.string().min(1),
    items: z.record(EntityId, SpriteItem),
  })
  .strict();
export type SpritePack = z.infer<typeof SpritePackV1>;

/** READ guard: parse, don't trust. Used on the coding side (M3) and at assemble time. */
export function parseSpritePack(input: unknown): SpritePack {
  return SpritePackV1.parse(input);
}
