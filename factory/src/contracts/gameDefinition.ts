import { z } from 'zod/v4';

/** Code-ready identifier: lowercase letters only. Shared by design, art (M2), coding (M3). */
export const EntityId = z.string().regex(/^[a-z]+$/, 'EntityId must be lowercase letters only');

export const EntityRole = z.enum([
  'player',
  'enemy',
  'obstacle',
  'collectible',
  'projectile',
  'hazard',
  'goal',
  'neutral',
]);

export const Entity = z
  .object({
    id: EntityId,
    role: EntityRole,
    description: z.string().min(1),
  })
  .strict();

export const Mechanic = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

/** Replaces the prototype's mandatory win+fail. A game has exactly one goal shape. */
export const Goal = z.discriminatedUnion('type', [
  z.object({ type: z.literal('survive'), forSeconds: z.number().int().positive().optional(), description: z.string().min(1) }).strict(),
  z.object({ type: z.literal('score'), target: z.number().int().positive().optional(), description: z.string().min(1) }).strict(),
  z.object({ type: z.literal('reach'), target: z.string().min(1), description: z.string().min(1) }).strict(),
  z.object({ type: z.literal('clear'), description: z.string().min(1) }).strict(),
]);

export const Orientation = z.enum(['portrait', 'landscape']);

export const Spatial = z
  .object({
    usesFullScreen: z.literal(true),
    orientation: Orientation,
  })
  .strict();

/** The single artifact crossing the design→coding boundary. */
export const GameDefinitionV1 = z
  .object({
    schemaVersion: z.literal('gamedef/v1'),
    title: z.string().min(1),
    description: z.string().min(1),
    coreVerb: z.string().min(1),
    hook: z.string().min(1),
    loop: z.string().min(1),
    mechanics: z.array(Mechanic).min(1).max(2),
    entities: z.array(Entity).min(1).max(3),
    goal: Goal,
    controls: z.string().min(1),
    spatial: Spatial,
    estimatedPlaytimeSec: z.number().int().positive(),
  })
  .strict()
  .refine((g) => new Set(g.entities.map((e) => e.id)).size === g.entities.length, {
    message: 'entity ids must be unique',
    path: ['entities'],
  });

export type GameDefinition = z.infer<typeof GameDefinitionV1>;

/** READ guard: parse, don't trust. Used on the coding side (M3) and at assemble time. */
export function parseGameDefinition(input: unknown): GameDefinition {
  return GameDefinitionV1.parse(input);
}
