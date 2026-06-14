import { describe, it, expect } from 'vitest';
import { Observer } from '../../src/observability/observer.js';
import { UsageAggregator } from '../../src/observability/usage.js';
import { createLogger } from '../../src/observability/logger.js';
import { createRunContext } from '../../src/observability/runContext.js';
import type { FactoryEvent } from '../../src/observability/events.js';

function build() {
  const events: FactoryEvent[] = [];
  const observer = new Observer({
    ctx: createRunContext({ model: 'mock' }),
    logger: createLogger({ level: 'silent' }),
    usage: new UsageAggregator(),
    sink: (e) => events.push(e),
  });
  return { observer, events };
}

describe('Observer FactorySink seam', () => {
  it('emits node lifecycle, llm_call, and progress events to the host sink', () => {
    const { observer, events } = build();

    observer.nodeStart('design');
    observer.llmCall({ node: 'design', model: 'claude-opus-4-8', usage: { inputTokens: 1, outputTokens: 2 }, costUsd: 0.5, latencyMs: 7 });
    observer.nodeEnd('design', 12);
    observer.progress('done', 'My Game');

    expect(events.map((e) => e.type)).toEqual(['node_start', 'llm_call', 'node_end', 'progress']);

    const call = events.find((e) => e.type === 'llm_call');
    expect(call).toMatchObject({ node: 'design', model: 'claude-opus-4-8', costUsd: 0.5, latencyMs: 7 });
    const progress = events.find((e) => e.type === 'progress');
    expect(progress).toMatchObject({ name: 'done', label: 'My Game' });
  });

  it('emits node_error when a node fails', () => {
    const { observer, events } = build();
    observer.nodeError('design', new Error('boom'), 3);
    expect(events).toEqual([{ type: 'node_error', node: 'design', ms: 3, error: 'boom' }]);
  });

  it('is optional — no sink means no throw', () => {
    const observer = new Observer({
      ctx: createRunContext({ model: 'mock' }),
      logger: createLogger({ level: 'silent' }),
      usage: new UsageAggregator(),
    });
    expect(() => observer.progress('done')).not.toThrow();
  });
});
