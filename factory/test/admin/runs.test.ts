import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fromMap } from '../../src/llm/providers/mock.js';
import { createApp } from '../../server/index.js';
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

/**
 * The admin is now a REST client. These tests stand up the REAL pipeline service backed by a
 * MockProvider (no network to Claude) and point the admin at it over HTTP — proving the admin
 * drives phases across the process boundary, not by importing them in-process.
 */
const logger = createLogger({ level: 'silent' });

// One pipeline serving every phase; the MockProvider dispatches by tool name.
const allFixtures = fromMap({
  seedGenerator: seedFixture,
  seedSelector: selectionFixture,
  elaborate: draftFixture,
  critic: passCritique,
  sprite: spriteDslFixture,
  codeGen: gameCodeFixture,
  codeReview: codeReviewPass,
});

let fixturesServer: Server;
let emptyServer: Server;
let fixturesBase: string;
let emptyBase: string;
const prevPipelineUrl = process.env.PIPELINE_URL;

const serve = (provider: ReturnType<typeof fromMap>): Promise<Server> =>
  new Promise((resolve) => {
    const server = createApp({ providerFor: () => provider, logger }).listen(0, '127.0.0.1', () => resolve(server));
  });

beforeAll(async () => {
  fixturesServer = await serve(allFixtures);
  emptyServer = await serve(fromMap({}));
  fixturesBase = `http://127.0.0.1:${(fixturesServer.address() as AddressInfo).port}`;
  emptyBase = `http://127.0.0.1:${(emptyServer.address() as AddressInfo).port}`;
  process.env.PIPELINE_URL = fixturesBase;
});

afterAll(async () => {
  if (prevPipelineUrl === undefined) delete process.env.PIPELINE_URL;
  else process.env.PIPELINE_URL = prevPipelineUrl;
  await Promise.all([fixturesServer, emptyServer].map((s) => new Promise<void>((r) => s.close(() => r()))));
});

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

describe('admin run orchestration (REST client over a mock pipeline)', () => {
  it('design: streams progress + cost-bearing llm_call events, ends in a valid GameDefinition', async () => {
    const { bus } = startDesign({ now: 0, numSeeds: 2 });
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
    const { bus } = startArt({ now: 0, game: validGame });
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('art');
    const pack = parseSpritePack(done.artifact);
    expect(Object.keys(pack.items).sort()).toEqual(['block', 'player']);
  });

  it('error: a failing pipeline run surfaces as a terminal error event', async () => {
    process.env.PIPELINE_URL = emptyBase; // provider has no fixtures → the phase throws server-side
    try {
      const { bus } = startDesign({ now: 0, numSeeds: 1 });
      const events = await drain(bus);
      expect(events.at(-1)!.type).toBe('error');
    } finally {
      process.env.PIPELINE_URL = fixturesBase;
    }
  });

  it('a dead SSE subscriber (throws on write) does not crash the relay or abort the run', async () => {
    const { traceId, bus } = startDesign({ now: 0, numSeeds: 1 });
    // Simulate a browser whose connection died: its writer throws on every event. Before the
    // fix this propagated into the pipeline NDJSON reader and aborted the in-flight run.
    bus.subscribe(() => {
      throw new Error('write after end');
    });
    const events = await new Promise<BusEvent[]>((resolve) => {
      const collected: BusEvent[] = [];
      bus.subscribe((e) => {
        collected.push(e);
        if (e.type === 'done' || e.type === 'error') resolve(collected);
      });
    });
    void traceId;
    expect(events.at(-1)!.type).toBe('done');
  });

  it('error: an unreachable pipeline surfaces as a terminal error event', async () => {
    process.env.PIPELINE_URL = 'http://127.0.0.1:1'; // nothing listening
    try {
      const { bus } = startDesign({ now: 0, numSeeds: 1 });
      const events = await drain(bus);
      const last = events.at(-1)!;
      expect(last.type).toBe('error');
      if (last.type === 'error') expect(last.message).toMatch(/unreachable/);
    } finally {
      process.env.PIPELINE_URL = fixturesBase;
    }
  });
});

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

browser('admin code orchestration (mock LLM pipeline, real gate)', () => {
  it('code: runs the coding phase off an art {game, pack} and ends in a passing bundle', async () => {
    const { bus } = startCode({ now: 0, game: validGame, pack: validSpritePack });
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
    const { bus } = startCode({ now: 0, game: validGame }); // no pack → art runs inline in the pipeline
    const events = await drain(bus);

    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('code');
    expect((done.artifact as { report: { passed: boolean } }).report.passed).toBe(true);
    expect(events.some((e) => e.type === 'node_start' && e.node === 'sprite:player')).toBe(true);
    expect(events.some((e) => e.type === 'node_start' && e.node === 'code:generate')).toBe(true);
  }, 60000);
});
