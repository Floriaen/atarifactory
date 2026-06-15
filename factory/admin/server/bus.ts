import type { StreamEvent } from '@game-factory/contracts';

/**
 * The bus carries the pipeline's full wire protocol verbatim — the factory events
 * plus the service-minted `done`/`error` terminal. The shape lives once in
 * `@game-factory/contracts` ({@link StreamEvent}); no admin-local re-definition.
 */
export type BusEvent = StreamEvent;

const isTerminal = (e: BusEvent): boolean => e.type === 'done' || e.type === 'error';

/**
 * Per-run in-memory event stream. Buffers everything so a late subscriber (the SSE
 * client connecting a beat after the run starts) replays from the top and misses
 * nothing. Closes on the terminal event.
 */
export class RunBus {
  private readonly buffer: BusEvent[] = [];
  private readonly subs = new Set<(e: BusEvent) => void>();
  private closed = false;

  get isClosed(): boolean {
    return this.closed;
  }

  emit(e: BusEvent): void {
    this.buffer.push(e);
    // Isolate subscriber faults: a dead SSE socket whose `res.write` throws ("write after end")
    // must NOT bubble up to the caller — that caller is the pipeline NDJSON reader, and an
    // exception there abandons the upstream response, which makes the stateless pipeline abort
    // the in-flight LLM calls ("Request was aborted"). Drop the broken subscriber; keep the run.
    for (const fn of [...this.subs]) {
      try {
        fn(e);
      } catch {
        this.subs.delete(fn);
      }
    }
    if (isTerminal(e)) {
      this.closed = true;
      this.subs.clear();
    }
  }

  /** Replays buffered events, then streams live ones. Returns an unsubscribe fn. */
  subscribe(fn: (e: BusEvent) => void): () => void {
    for (const e of this.buffer) fn(e);
    if (this.closed) return () => {};
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
}

// ── Registry keyed by traceId, with a TTL sweep so long sessions don't leak. ──
const TTL_MS = 30 * 60 * 1000;
const buses = new Map<string, { bus: RunBus; createdAt: number }>();

export function createBus(traceId: string, now: number): RunBus {
  sweep(now);
  const bus = new RunBus();
  buses.set(traceId, { bus, createdAt: now });
  return bus;
}

export function getBus(traceId: string): RunBus | undefined {
  return buses.get(traceId)?.bus;
}

function sweep(now: number): void {
  for (const [id, { createdAt }] of buses) {
    if (now - createdAt > TTL_MS) buses.delete(id);
  }
}
