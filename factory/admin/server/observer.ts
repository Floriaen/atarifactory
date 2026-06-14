import {
  Observer,
  RunStore,
  UsageAggregator,
  withTrace,
  type Logger,
  type RunContext,
} from '../../src/api.js';
import type { RunBus } from './bus.js';

/**
 * Adapts core observability to a {@link RunBus}: the ONLY place the admin touches
 * the factory's observability, and it does so through the public `sink` seam —
 * forwarding every `FactoryEvent` to the bus. pino still logs to stdout; file
 * traces are still written by `RunStore`.
 */
export function buildStreamingObserver(
  ctx: RunContext,
  bus: RunBus,
  baseLogger: Logger,
): { observer: Observer; usage: UsageAggregator; store: RunStore } {
  const usage = new UsageAggregator();
  const store = new RunStore(ctx);
  const observer = new Observer({
    ctx,
    logger: withTrace(baseLogger, ctx.traceId),
    usage,
    store,
    sink: (e) => bus.emit(e),
  });
  return { observer, usage, store };
}
