/**
 * Admin-side persistence. The pipeline is stateless and writes nothing; the admin
 * owns the on-disk record. Mirrors what the factory's old `RunStore.finalize` wrote —
 * `runs/<id>/trace.json` (and `runs/<id>/game/` for a code run) — so `make view`,
 * `make play`, and the admin's own disk source-resolution keep working unchanged.
 *
 * Imports ONLY `@game-factory/contracts` (types). No factory `src/` dependency.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GameBundle, GameDefinition, SpritePack } from '@game-factory/contracts';

/** The on-disk run root. Configurable (tests point it at a temp dir); shared with cache.ts. */
export function runsDir(): string {
  return process.env.RUNS_DIR ?? 'runs';
}

async function writeTrace(traceId: string, trace: unknown): Promise<void> {
  const dir = join(runsDir(), traceId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'trace.json'), JSON.stringify(trace, null, 2));
}

export async function persistDesign(traceId: string, game: GameDefinition, usage: unknown): Promise<void> {
  await writeTrace(traceId, { traceId, game, usage });
}

/** Art traces carry both `game` and `pack` so a later code run can chain off this trace on disk. */
export async function persistArt(traceId: string, game: GameDefinition, pack: SpritePack, usage: unknown): Promise<void> {
  await writeTrace(traceId, { traceId, source: { title: game.title }, game, pack, usage });
}

/**
 * A code run: write the bundle under `runs/<id>/game/` (so `make play TRACE=<id>` works) and a
 * trace carrying the game + report. The report rides the trace, NOT the bundle's `files[]`.
 */
export async function persistCode(
  traceId: string,
  game: GameDefinition,
  artifact: { report: unknown; bundle: GameBundle },
  usage: unknown,
): Promise<void> {
  const { bundle, report } = artifact;
  const gameDir = join(runsDir(), traceId, 'game');
  await mkdir(gameDir, { recursive: true });
  await Promise.all(bundle.files.map((f) => writeFile(join(gameDir, f.path), f.contents)));
  await writeTrace(traceId, {
    traceId,
    source: { title: game.title },
    game,
    gameId: bundle.gameId,
    entry: bundle.entry,
    report,
    usage,
  });
}
