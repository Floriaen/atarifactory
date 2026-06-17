/**
 * Admin-side persistence. The pipeline is stateless and writes nothing; the admin owns the on-disk
 * record. A game's phases share ONE directory — `runs/<gameId>/` — so design + art + the playable
 * build live together:
 *
 *   runs/<gameId>/game.json     the GameDefinition (the game's identity; written by design)
 *   runs/<gameId>/art.json      the SpritePack     (written by art)
 *   runs/<gameId>/report.json   the gate CodeReport (written by code)
 *   runs/<gameId>/game/         the playable bundle (written by code) — make play TRACE=<gameId>
 *
 *   runs/<gameId>/usage.json    tokens/cost/time, accumulated across the game's phases
 *
 * Re-running a phase overwrites its file (latest wins). Imports ONLY `@game-factory/contracts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GameBundle, GameDefinition, SpritePack } from '@game-factory/contracts';

/** The on-disk run root. Configurable (tests point it at a temp dir); shared with cache.ts. */
export function runsDir(): string {
  return process.env.RUNS_DIR ?? 'runs';
}

async function writeJson(gameId: string, file: string, value: unknown): Promise<void> {
  const dir = join(runsDir(), gameId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), JSON.stringify(value, null, 2));
}

/** The design establishes the game's identity: write the GameDefinition as game.json. */
export async function persistDesign(gameId: string, game: GameDefinition): Promise<void> {
  await writeJson(gameId, 'game.json', game);
}

/** Art writes into the SAME game dir (re-affirming game.json so an art-first run is still complete). */
export async function persistArt(gameId: string, game: GameDefinition, pack: SpritePack): Promise<void> {
  await writeJson(gameId, 'game.json', game);
  await writeJson(gameId, 'art.json', pack);
}

/** Per-game tokens/cost/time, summed across whatever phases ran into the dir. */
export interface RunUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  calls: number;
  durationMs: number;
}

const ZERO_USAGE: RunUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0, durationMs: 0 };

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Add one phase's usage totals (`done.usage`, untyped on the wire) + its wall-clock to the game's
 * running tally. ponytail: this accumulates across phase re-runs — design mints a fresh gameId so
 * it's safe, but re-running art/code into the same dir double-counts. Acceptable for a cost display.
 */
export async function accumulateUsage(gameId: string, usage: unknown, durationMs: number): Promise<void> {
  const file = join(runsDir(), gameId, 'usage.json');
  let prev = ZERO_USAGE;
  if (existsSync(file)) {
    try {
      prev = { ...ZERO_USAGE, ...(JSON.parse(readFileSync(file, 'utf8')) as Partial<RunUsage>) };
    } catch {
      /* corrupt tally — start fresh */
    }
  }
  const u = usage as Partial<RunUsage> | undefined;
  const next: RunUsage = {
    inputTokens: prev.inputTokens + num(u?.inputTokens),
    outputTokens: prev.outputTokens + num(u?.outputTokens),
    costUsd: prev.costUsd + num(u?.costUsd),
    calls: prev.calls + num(u?.calls),
    durationMs: prev.durationMs + num(durationMs),
  };
  await writeJson(gameId, 'usage.json', next);
}

/** Code writes the report + the playable bundle under the same game dir. */
export async function persistCode(
  gameId: string,
  game: GameDefinition,
  artifact: { report: unknown; bundle: GameBundle },
): Promise<void> {
  const { bundle, report } = artifact;
  await writeJson(gameId, 'game.json', game);
  await writeJson(gameId, 'report.json', report);
  const gameDir = join(runsDir(), gameId, 'game');
  await mkdir(gameDir, { recursive: true });
  await Promise.all(bundle.files.map((f) => writeFile(join(gameDir, f.path), f.contents)));
}
