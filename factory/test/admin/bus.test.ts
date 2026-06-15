import { describe, it, expect } from 'vitest';
import { RunBus } from '../../admin/server/bus.js';

describe('RunBus subscriber isolation', () => {
  it('a throwing subscriber never breaks emit, is dropped, and other subscribers still receive', () => {
    const bus = new RunBus();
    const good: string[] = [];
    bus.subscribe(() => {
      throw new Error('dead socket: write after end');
    });
    bus.subscribe((e) => good.push(e.type));

    // The throwing subscriber must not propagate out of emit (which would crash the
    // pipeline NDJSON reader and abort the run) and must not starve the good subscriber.
    expect(() => bus.emit({ type: 'node_start', node: 'sprite:mote' })).not.toThrow();
    expect(() => bus.emit({ type: 'progress', name: 'done' })).not.toThrow();

    expect(good).toEqual(['node_start', 'progress']);
  });
});
