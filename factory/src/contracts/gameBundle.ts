import { z } from 'zod/v4';

/** The inlined sprite-data script — `window.spritePack = {…}`, built from the SpritePack. */
export const SPRITE_DATA_FILE = 'sprites.data.js';
/** The LLM-authored game logic — the ONLY file the model writes. */
export const GAME_JS_FILE = 'game.js';
/** The bundle entry point the shell serves. */
export const ENTRY_FILE = 'index.html';

/** One file in the bundle. `path` is a relative filename (no leading slash, no `..`). */
export const GameFile = z
  .object({
    path: z.string().min(1),
    contents: z.string().min(1),
  })
  .strict();
export type GameFile = z.infer<typeof GameFile>;

/**
 * The single artifact crossing the coding→host boundary — the factory's final
 * output. A self-contained set of files that runs from `file://` (sprites are
 * inlined, no fetch). Mirrors `SpritePackV1`: `.strict()`, versioned, single writer.
 */
export const GameBundleV1 = z
  .object({
    schemaVersion: z.literal('gamebundle/v1'),
    generatedAt: z.string().min(1),
    gameId: z.string().min(1),
    entry: z.literal(ENTRY_FILE),
    files: z.array(GameFile).min(3),
  })
  .strict()
  .superRefine((bundle, ctx) => {
    const paths = bundle.files.map((f) => f.path);

    // Paths are unique.
    const seen = new Set<string>();
    paths.forEach((p, i) => {
      if (seen.has(p)) {
        ctx.addIssue({ code: 'custom', message: `duplicate file path "${p}"`, path: ['files', i, 'path'] });
      }
      seen.add(p);
    });

    // The bundle is runnable: it carries the entry, the game logic, and the sprite data.
    for (const required of [bundle.entry, GAME_JS_FILE, SPRITE_DATA_FILE]) {
      if (!seen.has(required)) {
        ctx.addIssue({ code: 'custom', message: `bundle is missing required file "${required}"`, path: ['files'] });
      }
    }
  });
export type GameBundle = z.infer<typeof GameBundleV1>;

/** READ guard: parse, don't trust. Used at the write boundary and by any host. */
export function parseGameBundle(input: unknown): GameBundle {
  return GameBundleV1.parse(input);
}
