import { describe, it, expect } from 'vitest';
import { fromMap } from '../../src/llm/providers/mock.js';
import { createLogger, parseGameDefinition, parseSpritePack } from '../../src/api.js';
import { startArt, startDesign } from '../../admin/server/runs.js';
import type { RunBus, BusEvent } from '../../admin/server/bus.js';
import {
  draftFixture,
  passCritique,
  seedFixture,
  selectionFixture,
  spriteDslFixture,
  validGame,
} from '../helpers/fixtures.js';

const logger = createLogger({ level: 'silent' });

/** Drain a run's bus to its terminal event, collecting everything. */
function drain(bus: RunBus): Promise<BusEvent[]> {
  return new Promise((resolve) => {
    const events: BusEvent[] = [];
    bus.subscribe((e) => {
      events.push(e);
      if (e.type === 'done' || e.type === 'error') resolve(events);
    });
  });
}

describe('admin run orchestration (mock, in-process)', () => {
  it('design: streams progress + cost-bearing llm_call events, ends in a valid GameDefinition', async () => {
    const provider = fromMap({
      seedGenerator: seedFixture,
      seedSelector: selectionFixture,
      elaborate: draftFixture,
      critic: passCritique,
    });

    const { bus } = startDesign({ provider, logger, now: 0, numSeeds: 2 });
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('design');
    expect(() => parseGameDefinition(done.artifact)).not.toThrow();

    expect(events.some((e) => e.type === 'progress')).toBe(true);
    const calls = events.filter((e) => e.type === 'llm_call');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((e) => e.type === 'llm_call' && e.costUsd > 0)).toBe(true);
  });

  it('art: ends in a valid SpritePack, one item per entity', async () => {
    const provider = fromMap({ sprite: spriteDslFixture });

    const { bus } = startArt({ provider, logger, now: 0, game: validGame });
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('art');
    const pack = parseSpritePack(done.artifact);
    expect(Object.keys(pack.items).sort()).toEqual(['block', 'player']);
  });

  it('error: a failing provider emits a terminal error event', async () => {
    const provider = fromMap({}); // no fixtures → throws on first call
    const { bus } = startDesign({ provider, logger, now: 0, numSeeds: 1 });
    const events = await drain(bus);

    expect(events.at(-1)!.type).toBe('error');
  });
});
