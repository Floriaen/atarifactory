// Dev entry: run the art phase against a cached design and print ASCII sprites.
//   make art                 # first cached design
//   make art I=2             # cached design at index 2
//   make art TRACE=<traceId> # cached design by traceId
//
// Reads runs/cache/design-games.json (written by `make batch`), runs runArtPhase,
// writes runs/<traceId>/trace.json with the SpritePack, and prints an ASCII
// preview per entity. Fail loud if the cache or the API key is absent.
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

import { selectProvider } from '../src/llm/selectProvider.js';
import { runArtPhase } from '../src/art/runArtPhase.js';
import { maskToAscii } from '../src/art/asciiPreview.js';
import { parseGameDefinition } from '@game-factory/contracts';
import { Observer } from '../src/observability/observer.js';
import { UsageAggregator } from '../src/observability/usage.js';
import { createLogger, withTrace } from '../src/observability/logger.js';
import { createRunContext } from '../src/observability/runContext.js';
import { RunStore } from '../src/observability/runStore.js';
import { DEFAULT_MODEL } from '../src/llm/models.js';

if (process.env.PROVIDER !== 'claude-code' && !process.env.ANTHROPIC_API_KEY) {
  console.error('[art] ANTHROPIC_API_KEY is not set. Add it to factory/.env (or set PROVIDER=claude-code), then re-run `make art`.');
  process.exit(1);
}

const CACHE_FILE = 'runs/cache/design-games.json';
if (!existsSync(CACHE_FILE)) {
  console.error(`[art] ${CACHE_FILE} not found. Run \`make batch\` first to cache some designs.`);
  process.exit(1);
}

interface CacheEntry {
  traceId: string;
  game: unknown;
}

const entries = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as CacheEntry[];
if (!Array.isArray(entries) || entries.length === 0) {
  console.error(`[art] ${CACHE_FILE} has no entries.`);
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
  console.error(`[art] no cached design matched ${traceArg ? `TRACE=${traceArg}` : `I=${idxArg}`}.`);
  process.exit(1);
}

const game = parseGameDefinition(picked.game); // read guard — fail loud on a stale cache

const ctx = createRunContext({ model: DEFAULT_MODEL, devTrace: process.env.DEV_TRACE === '1' });
const usage = new UsageAggregator();
const baseLogger = createLogger();
const store = new RunStore(ctx);
const observer = new Observer({ ctx, logger: withTrace(baseLogger, ctx.traceId), usage, store });

const { pack } = await runArtPhase(game, { provider: selectProvider(), observer });
const timings = observer.timings;
const totals = usage.totals();

await store.finalize({
  traceId: ctx.traceId,
  source: { traceId: picked.traceId, title: game.title },
  game, // persisted so the coding phase (and the admin) can chain off this trace on disk
  pack,
  timings,
  usage: { totals, perModel: usage.perModel() },
});

console.log(`\n══════════════════════ ${game.title} — SPRITES ══════════════════════`);
for (const [id, item] of Object.entries(pack.items)) {
  console.log(`\n${id}  (${item.gridSize}×${item.gridSize}, ${item.frames.length} frame${item.frames.length > 1 ? 's' : ''})`);
  console.log(maskToAscii(item.frames));
}
console.log(`\n[art] traceId=${ctx.traceId}  cost=$${totals.costUsd.toFixed(4)}  →  make view TRACE=${ctx.traceId}`);
