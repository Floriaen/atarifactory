// Dev entry: run the coding phase (M3) against a cached design and write a playable bundle.
//   make code                    # first cached design; sprites generated inline (art phase)
//   make code I=2                # cached design at index 2
//   make code TRACE=<designId>   # cached design by its design traceId
//   make code ART=<artTraceId>   # reuse a cached art run's SpritePack instead of regenerating
//
// Reads runs/cache/design-games.json (written by `make batch`), obtains a SpritePack (inline art
// run, or a cached art trace), runs runCodePhase, ALWAYS writes the bundle under
// runs/<traceId>/game/ (pass or fail) so `make play` works on near-misses, persists the gate
// report into the trace, prints the report + cost, and exits non-zero when !report.passed.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

if (existsSync('.env')) process.loadEnvFile('.env');

import { selectProvider } from '../src/llm/selectProvider.js';
import { runArtPhase } from '../src/art/runArtPhase.js';
import { runCodePhase } from '../src/coding/runCodePhase.js';
import { parseGameDefinition } from '../src/contracts/gameDefinition.js';
import { parseSpritePack, type SpritePack } from '../src/contracts/spritePack.js';
import { Observer } from '../src/observability/observer.js';
import { UsageAggregator } from '../src/observability/usage.js';
import { createLogger, withTrace } from '../src/observability/logger.js';
import { createRunContext } from '../src/observability/runContext.js';
import { RunStore } from '../src/observability/runStore.js';
import { DEFAULT_MODEL } from '../src/llm/models.js';

if (process.env.PROVIDER !== 'claude-code' && !process.env.ANTHROPIC_API_KEY) {
  console.error('[code] ANTHROPIC_API_KEY is not set. Add it to factory/.env (or set PROVIDER=claude-code), then re-run `make code`.');
  process.exit(1);
}

const CACHE_FILE = 'runs/cache/design-games.json';
if (!existsSync(CACHE_FILE)) {
  console.error(`[code] ${CACHE_FILE} not found. Run \`make batch\` first to cache some designs.`);
  process.exit(1);
}

interface CacheEntry {
  traceId: string;
  game: unknown;
}

const entries = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as CacheEntry[];
if (!Array.isArray(entries) || entries.length === 0) {
  console.error(`[code] ${CACHE_FILE} has no entries.`);
  process.exit(1);
}

const argOf = (flag: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : undefined;
};

const traceArg = argOf('TRACE');
const idxArg = argOf('I');
const picked = traceArg
  ? entries.find((e) => e.traceId === traceArg)
  : entries[Math.max(0, Math.min(entries.length - 1, Number(idxArg ?? 0) || 0))];
if (!picked) {
  console.error(`[code] no cached design matched ${traceArg ? `TRACE=${traceArg}` : `I=${idxArg}`}.`);
  process.exit(1);
}

const game = parseGameDefinition(picked.game); // read guard — fail loud on a stale cache

const ctx = createRunContext({ model: DEFAULT_MODEL, devTrace: process.env.DEV_TRACE === '1' });
const usage = new UsageAggregator();
const baseLogger = createLogger();
const store = new RunStore(ctx);
const observer = new Observer({ ctx, logger: withTrace(baseLogger, ctx.traceId), usage, store });
const provider = selectProvider();

// SpritePack: reuse a cached art trace if ART= is given, else generate sprites inline.
const artArg = argOf('ART');
let pack: SpritePack;
if (artArg) {
  const artTracePath = `runs/${artArg}/trace.json`;
  if (!existsSync(artTracePath)) {
    console.error(`[code] ${artTracePath} not found — pass ART=<artTraceId> of a completed \`make art\` run.`);
    process.exit(1);
  }
  const artTrace = JSON.parse(readFileSync(artTracePath, 'utf8')) as { pack?: unknown };
  pack = parseSpritePack(artTrace.pack);
  console.log(`[code] reusing SpritePack from ${artTracePath}`);
} else {
  console.log('[code] generating sprites inline (art phase)…');
  ({ pack } = await runArtPhase(game, { provider, observer }));
}

const { bundle, report } = await runCodePhase(game, pack, { provider, observer });

// ALWAYS write the bundle (pass or fail) so `make play` works on near-misses.
const gameDir = `runs/${ctx.traceId}/game`;
await mkdir(gameDir, { recursive: true });
await Promise.all(bundle.files.map((f) => writeFile(join(gameDir, f.path), f.contents)));

const totals = usage.totals();
// Persist the report into the trace — NOT into the bundle's files[].
await store.finalize({
  traceId: ctx.traceId,
  source: { traceId: picked.traceId, title: game.title },
  gameId: bundle.gameId,
  entry: bundle.entry,
  report,
  timings: observer.timings,
  usage: { totals, perModel: usage.perModel() },
});

const mark = (ok: boolean): string => (ok ? '✓' : '✗');
const c = report.checks;
console.log(`\n══════════════════════ ${game.title} — CODE ══════════════════════`);
console.log(`  floor   syntax ${mark(c.syntax)}   lint ${mark(c.lint)}   smoke ${mark(c.smoke)}`);
console.log(`  soft    interaction ${mark(c.interaction)}   progression ${mark(c.progression)}   faithful ${mark(c.faithful)}`);
console.log(`  passed  ${report.passed ? 'YES' : 'NO'}`);
if (report.issues.length) {
  console.log('  issues:');
  for (const i of report.issues) console.log(`    - ${i}`);
}
console.log(`\n  bundle → ${gameDir}/  (${bundle.files.length} files)`);
console.log(`[code] traceId=${ctx.traceId}  cost=$${totals.costUsd.toFixed(4)}  →  make play TRACE=${ctx.traceId}`);

process.exit(report.passed ? 0 : 1);
