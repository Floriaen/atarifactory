import type { Logger } from './logger.js';
import type { UsageAggregator } from './usage.js';
import type { RunStore } from './runStore.js';
import type { ProgressTracker } from './progress.js';
import type { LlmCallRecord, NodeTiming } from './llmCall.js';
import type { RunContext } from './runContext.js';

export interface ObserverDeps {
  ctx: RunContext;
  logger: Logger;
  usage: UsageAggregator;
  store?: RunStore;
  progress?: ProgressTracker;
}

/**
 * The single fan-out the rest of the system writes to. Keeps `defineChain`
 * small and means there is exactly one place that decides where signal goes.
 */
export class Observer {
  readonly timings: NodeTiming[] = [];

  constructor(private readonly deps: ObserverDeps) {}

  get ctx(): RunContext {
    return this.deps.ctx;
  }

  llmCall(rec: LlmCallRecord): void {
    this.deps.usage.add(rec.model, rec.usage);
    this.deps.logger.info(
      { node: rec.node, model: rec.model, ms: rec.latencyMs, usage: rec.usage, costUsd: rec.costUsd },
      'llm_call',
    );
    void this.deps.store?.event({
      t: Date.now(),
      type: 'llm_call',
      node: rec.node,
      model: rec.model,
      latencyMs: rec.latencyMs,
      usage: rec.usage,
      costUsd: rec.costUsd,
      ...(this.deps.ctx.devTrace
        ? { system: rec.system, messages: rec.messages, output: rec.output }
        : {}),
    });
  }

  nodeStart(node: string): void {
    this.deps.logger.debug({ node }, 'node_start');
    void this.deps.store?.event({ t: Date.now(), type: 'node_start', node });
  }

  nodeEnd(node: string, ms: number): void {
    this.timings.push({ node, ms, status: 'ok' });
    this.deps.logger.info({ node, ms }, 'node_end');
    void this.deps.store?.event({ t: Date.now(), type: 'node_end', node, ms });
  }

  nodeError(node: string, err: unknown, ms: number): void {
    this.timings.push({ node, ms, status: 'error' });
    this.deps.logger.error(
      { node, ms, err: err instanceof Error ? { message: err.message, stack: err.stack } : err },
      'node_error',
    );
    void this.deps.store?.event({
      t: Date.now(),
      type: 'node_error',
      node,
      ms,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  progress(name: string, label?: string): void {
    this.deps.progress?.complete(name, label);
  }
}
