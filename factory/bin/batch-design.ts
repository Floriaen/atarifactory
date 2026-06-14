// Run the design phase N times against the live provider and cache the results.
//   make batch              # 10 runs, concurrency 3
//   make batch N=20 C=5
//
// Writes runs/cache/design-games.json (an array of finished GameDefinitions plus
// provenance) — a ready-made fixture set for replaying designs without the network,
// e.g. feeding a mock design phase to downstream milestones. Each run also leaves its
// own runs/<traceId>/ trace as usual.
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

if (existsSync('.env')) process.loadEnvFile('.env');

import { selectProvider } from '../src/llm/selectProvider.js';
import { runDesignPhase } from '../src/design/runDesignPhase.js';
import { Observer } from '../src/observability/observer.js';
import { UsageAggregator } from '../src/observability/usage.js';
import { createLogger, withTrace } from '../src/observability/logger.js';
import { createRunContext } from '../src/observability/runContext.js';
import { RunStore } from '../src/observability/runStore.js';
import { DEFAULT_MODEL } from '../src/llm/models.js';
import type { GameDefinition } from '../src/contracts/gameDefinition.js';
import type { Critique, Seed } from '../src/contracts/phaseSchemas.js';

if (process.env.PROVIDER !== 'claude-code' && !process.env.ANTHROPIC_API_KEY) {
  console.error('[batch] ANTHROPIC_API_KEY is not set. Add it to factory/.env (or set PROVIDER=claude-code), then re-run.');
  process.exit(1);
}

const argOf = (flag: string, dflt: number): number => {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  const n = hit ? Number(hit.slice(flag.length + 1)) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
};
const COUNT = argOf('N', 10);
const CONCURRENCY = Math.min(argOf('C', 3), COUNT);
const CACHE_FILE = 'runs/cache/design-games.json';

interface CacheEntry {
  traceId: string;
  model: string;
  iterations: number;
  costUsd: number;
  chosen: Seed;
  critique: Critique;
  game: GameDefinition;
}

const provider = selectProvider();
const baseLogger = createLogger({ level: process.env.LOG_LEVEL ?? 'warn' });

async function runOnce(n: number): Promise<CacheEntry | null> {
  const ctx = createRunContext({ model: DEFAULT_MODEL });
  const usage = new UsageAggregator();
  const store = new RunStore(ctx);
  const observer = new Observer({ ctx, logger: withTrace(baseLogger, ctx.traceId), usage, store });
  try {
    const result = await runDesignPhase({ provider, observer });
    const totals = usage.totals();
    await store.finalize({
      traceId: ctx.traceId,
      game: result.game,
      critique: result.critique,
      iterations: result.iterations,
      timings: observer.timings,
      usage: { totals, perModel: usage.perModel() },
    });
    console.log(`  [${n}/${COUNT}] ✓ ${result.game.title}  (${result.iterations} refine, $${totals.costUsd.toFixed(4)}, ${ctx.traceId})`);
    return {
      traceId: ctx.traceId,
      model: ctx.model,
      iterations: result.iterations,
      costUsd: totals.costUsd,
      chosen: result.chosen,
      critique: result.critique,
      game: result.game,
    };
  } catch (err) {
    console.error(`  [${n}/${COUNT}] ✗ failed (${ctx.traceId}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Fixed-size worker pool over a shared index — keeps at most CONCURRENCY runs in flight.
console.log(`[batch] ${COUNT} design runs, concurrency ${CONCURRENCY}\n`);
const entries: CacheEntry[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const n = next++;
      if (n >= COUNT) return;
      const entry = await runOnce(n + 1);
      if (entry) entries.push(entry);
    }
  }),
);

await mkdir('runs/cache', { recursive: true });
await writeFile(CACHE_FILE, JSON.stringify(entries, null, 2));

const totalCost = entries.reduce((s, e) => s + e.costUsd, 0);
console.log(`\n[batch] ${entries.length}/${COUNT} succeeded → ${CACHE_FILE}  (total $${totalCost.toFixed(4)})`);
console.log('\n══════════════════════ GAME IDEAS ══════════════════════');
entries.forEach((e, i) => {
  const g = e.game;
  const goal = g.goal.type + (('target' in g.goal && g.goal.target) ? ` ${g.goal.target}` : '') + (('forSeconds' in g.goal && g.goal.forSeconds) ? ` ${g.goal.forSeconds}s` : '');
  console.log(`\n${String(i + 1).padStart(2)}. ${g.title}   [${e.critique.verdict}]`);
  console.log(`    verb: ${g.coreVerb}  ·  goal: ${goal}  ·  ~${g.estimatedPlaytimeSec}s  ·  ${g.spatial.orientation}`);
  console.log(`    ${g.description}`);
  console.log(`    hook:  ${g.hook}`);
  console.log(`    loop:  ${g.loop}`);
  console.log(`    seed:  ${e.chosen.persona} — ${e.chosen.whyFun}`);
  if (e.critique.issues.length) {
    console.log(`    issues: ${e.critique.issues.map((x) => `${x.target}(${x.severity})`).join(', ')}`);
  }
});
console.log('');
