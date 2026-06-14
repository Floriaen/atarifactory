import { describe, it, expect } from 'vitest';
import { fromMap } from '../../src/llm/providers/mock.js';
import { createLogger, parseGameBundle, parseGameDefinition, parseSpritePack } from '../../src/api.js';
import { startArt, startCode, startDesign } from '../../admin/server/runs.js';
import type { RunBus, BusEvent } from '../../admin/server/bus.js';
import {
  codeReviewPass,
  draftFixture,
  gameCodeFixture,
  passCritique,
  seedFixture,
  selectionFixture,
  spriteDslFixture,
  validGame,
  validSpritePack,
} from '../helpers/fixtures.js';
import { chromiumAvailable } from '../coding/chromium.js';

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

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

browser('admin code orchestration (mock LLM, real gate)', () => {
  it('code: runs the coding phase off an art {game, pack} and ends in a passing bundle', async () => {
    const provider = fromMap({ codeGen: gameCodeFixture, codeReview: codeReviewPass });

    const { bus } = startCode({ provider, logger, now: 0, game: validGame, pack: validSpritePack });
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('code');

    const artifact = done.artifact as { report: { passed: boolean }; bundle: unknown };
    expect(artifact.report.passed).toBe(true);
    expect(() => parseGameBundle(artifact.bundle)).not.toThrow();
    expect(events.some((e) => e.type === 'node_start' && e.node === 'code:generate')).toBe(true);
  }, 60000);

  it('code from a design (no pack): runs art inline first, then code, into one stream', async () => {
    const provider = fromMap({
      sprite: spriteDslFixture, // art phase, one call per entity
      codeGen: gameCodeFixture,
      codeReview: codeReviewPass,
    });

    const { bus } = startCode({ provider, logger, now: 0, game: validGame }); // no pack → art runs inline
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('code');
    expect((done.artifact as { report: { passed: boolean } }).report.passed).toBe(true);
    // both phases streamed through the same observer:
    expect(events.some((e) => e.type === 'node_start' && e.node === 'sprite:player')).toBe(true);
    expect(events.some((e) => e.type === 'node_start' && e.node === 'code:generate')).toBe(true);
  }, 60000);
});
