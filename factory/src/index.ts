// Dev entry: run the fully autonomous design phase and print the GameDefinition.
//   make run
import { existsSync } from 'node:fs';
import { selectProvider } from './llm/selectProvider.js';

// Load factory/.env (Node's built-in dotenv) so ANTHROPIC_API_KEY is available.
if (existsSync('.env')) process.loadEnvFile('.env');

import { runDesignPhase } from './design/runDesignPhase.js';
import { Observer } from './observability/observer.js';
import { UsageAggregator } from './observability/usage.js';
import { createLogger, withTrace } from './observability/logger.js';
import { createRunContext } from './observability/runContext.js';
import { RunStore } from './observability/runStore.js';
import { DEFAULT_MODEL } from './llm/models.js';

// PROVIDER=claude-code uses the subscription CLI (no key); otherwise the metered API needs a key.
if (process.env.PROVIDER !== 'claude-code' && !process.env.ANTHROPIC_API_KEY) {
  console.error(
    '[game-factory] ANTHROPIC_API_KEY is not set. Add it to factory/.env (or set PROVIDER=claude-code), then re-run `make run`.',
  );
  process.exit(1);
}

const ctx = createRunContext({ model: DEFAULT_MODEL, devTrace: process.env.DEV_TRACE === '1' });
const usage = new UsageAggregator();
const baseLogger = createLogger();
const store = new RunStore(ctx);
const observer = new Observer({
  ctx,
  logger: withTrace(baseLogger, ctx.traceId),
  usage,
  store,
});

const result = await runDesignPhase({ provider: selectProvider(), observer });

const totals = usage.totals();
await store.finalize({
  traceId: ctx.traceId,
  game: result.game,
  critique: result.critique,
  iterations: result.iterations,
  timings: observer.timings,
  usage: { totals, perModel: usage.perModel() },
});

baseLogger.info(
  { traceId: ctx.traceId, iterations: result.iterations, costUsd: totals.costUsd.toFixed(4) },
  'design complete',
);
console.log(JSON.stringify(result.game, null, 2));
console.log(`\n[game-factory] traceId=${ctx.traceId}  cost=$${totals.costUsd.toFixed(4)}  →  make view TRACE=${ctx.traceId}`);
