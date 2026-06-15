import { z } from 'zod/v4';
import { GameDefinitionV1 } from './gameDefinition.js';
import { SpritePackV1 } from './spritePack.js';

/**
 * The request bodies of the pipeline REST API (`POST /v1/{design,art,code}`). They
 * are part of the wire contract: the service Zod-validates the body at the edge, and
 * a TS client (the admin) imports these types to build well-formed requests. Every
 * phase is stateless — the full input rides in the body (art carries the whole
 * `GameDefinition`, code carries `game` + optional `pack`).
 */

/** Which model backend runs. Mirrors `selectProvider`'s accepted names. */
export const ProviderName = z.enum(['claude', 'claude-code']);
export type ProviderName = z.infer<typeof ProviderName>;

/** Force a model tier across the phase, or `default` for the factory's tuned tiering. */
export const ModelTier = z.enum(['default', 'opus', 'sonnet']);
export type ModelTier = z.infer<typeof ModelTier>;

const selectors = {
  provider: ProviderName.optional(),
  modelTier: ModelTier.optional(),
};

export const DesignRequest = z
  .object({ ...selectors, numSeeds: z.number().int().min(1).max(8).optional() })
  .strict();
export type DesignRequest = z.infer<typeof DesignRequest>;

export const ArtRequest = z.object({ ...selectors, game: GameDefinitionV1 }).strict();
export type ArtRequest = z.infer<typeof ArtRequest>;

export const CodeRequest = z
  .object({ ...selectors, game: GameDefinitionV1, pack: SpritePackV1.optional() })
  .strict();
export type CodeRequest = z.infer<typeof CodeRequest>;
