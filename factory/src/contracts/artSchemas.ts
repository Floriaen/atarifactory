import { z } from 'zod/v4';

/**
 * One sprite drawing op. The union is enforced at the schema boundary (a regex
 * over the 5 verbs) so a malformed op fails loud at `provider.structured`'s
 * re-validate step — never silently in the compiler. The compiler still clamps
 * in-range-but-oversized coordinates.
 */
export const SpriteOp = z
  .string()
  .regex(
    /^(rect \d+ \d+ \d+ \d+|oval \d+ \d+ \d+ \d+|line \d+ \d+ \d+ \d+|pixel \d+ \d+|mirror [HV])$/i,
    'SpriteOp must be one of: rect/oval/line x y w h, pixel x y, mirror H|V',
  );
export type SpriteOp = z.infer<typeof SpriteOp>;

export const SpriteFrame = z
  .object({
    ops: z.array(SpriteOp).min(1).max(40),
  })
  .strict();
export type SpriteFrame = z.infer<typeof SpriteFrame>;

/** The LLM output: a tiny drawing program the deterministic compiler renders. */
export const SpriteDsl = z
  .object({
    gridSize: z.number().int().min(8).max(32).default(12),
    frames: z.array(SpriteFrame).min(1).max(3),
    meta: z.object({ entity: z.string().min(1) }).strict().optional(),
  })
  .strict();
export type SpriteDsl = z.infer<typeof SpriteDsl>;
