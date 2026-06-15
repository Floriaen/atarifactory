import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../server/index.js';
import { createLogger, parseGameDefinition, parseSpritePack, type LLMProvider } from '../../src/api.js';
import { OPUS_MODEL } from '../../src/llm/models.js';
import { fromMap } from '../../src/llm/providers/mock.js';
import type { StreamEvent } from '@game-factory/contracts';
import {
  draftFixture,
  passCritique,
  seedFixture,
  selectionFixture,
  spriteDslFixture,
  validGame,
} from '../helpers/fixtures.js';

const logger = createLogger({ level: 'silent' });

const designFixtures = { seedGenerator: seedFixture, seedSelector: selectionFixture, elaborate: draftFixture, critic: passCritique };
const designProvider = () => fromMap(designFixtures);

/**
 * A provider whose calls take real time (and honour the abort signal). Unlike the instant
 * MockProvider, it keeps a run in-flight long enough to expose an abort-on-disconnect that
 * fires too early — the exact bug an instant mock can't catch.
 */
function slowProvider(map: Record<string, unknown>, delayMs: number, onAbort?: () => void): LLMProvider {
  return {
    name: 'slow',
    async structured(schema, _system, _messages, opts) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delayMs);
        opts.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          onAbort?.();
          reject(new Error('Request was aborted.'));
        });
      });
      const data = schema.parse(map[opts.toolName ?? '']);
      return { data, usage: { inputTokens: 10, outputTokens: 20 }, model: opts.model, stopReason: 'mock' };
    },
  };
}

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
});

async function start(opts: { provider?: LLMProvider; token?: string } = {}): Promise<string> {
  const app = createApp({
    providerFor: () => opts.provider ?? designProvider(),
    logger,
    ...(opts.token ? { token: opts.token } : {}),
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

interface NdjsonResult {
  status: number;
  events: StreamEvent[];
  json: unknown;
}

async function post(base: string, path: string, body: unknown, headers: Record<string, string> = {}): Promise<NdjsonResult> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/x-ndjson')) {
    const events = text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as StreamEvent);
    return { status: res.status, events, json: undefined };
  }
  return { status: res.status, events: [], json: text ? JSON.parse(text) : undefined };
}

describe('pipeline service (NDJSON, stateless)', () => {
  it('GET /health → { ok: true }', async () => {
    const base = await start();
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET /v1/models → providers + tiers', async () => {
    const base = await start();
    const models = (await (await fetch(`${base}/v1/models`)).json()) as {
      providers: string[];
      tiers: Array<{ id: string }>;
    };
    expect(models.providers).toContain('claude');
    expect(models.tiers.map((t) => t.id)).toEqual(['default', 'opus', 'sonnet']);
  });

  it('GET /v1/openapi.json → documents the three phase routes', async () => {
    const base = await start();
    const doc = (await (await fetch(`${base}/v1/openapi.json`)).json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(['/v1/design', '/v1/art', '/v1/code']);
  });

  it('POST /v1/design → streams progress + cost-bearing llm_call, ends in a valid GameDefinition', async () => {
    const base = await start({ provider: designProvider() });
    const { status, events } = await post(base, '/v1/design', { numSeeds: 2 });
    expect(status).toBe(200);

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

  it('POST /v1/design with modelTier:opus → every llm_call uses the Opus model', async () => {
    const base = await start({ provider: designProvider() });
    const { events } = await post(base, '/v1/design', { numSeeds: 1, modelTier: 'opus' });
    const calls = events.filter((e) => e.type === 'llm_call');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((e) => e.type === 'llm_call' && e.model === OPUS_MODEL)).toBe(true);
  });

  it('POST /v1/art → ends in a valid SpritePack, one item per entity', async () => {
    const base = await start({ provider: fromMap({ sprite: spriteDslFixture }) });
    const { status, events } = await post(base, '/v1/art', { game: validGame });
    expect(status).toBe(200);
    const done = events.at(-1)!;
    if (done.type !== 'done') throw new Error('not done');
    expect(done.kind).toBe('art');
    expect(Object.keys(parseSpritePack(done.artifact).items).sort()).toEqual(['block', 'player']);
  });

  it('POST /v1/design with a bad body → 400 before any stream starts', async () => {
    const base = await start();
    const bad = await post(base, '/v1/design', { numSeeds: 0 });
    expect(bad.status).toBe(400);
    expect((bad.json as { error: string }).error).toBeTruthy();

    const unknownField = await post(base, '/v1/design', { wat: true });
    expect(unknownField.status).toBe(400); // .strict() rejects unknown keys
  });

  it('POST /v1/art with an invalid game → 400', async () => {
    const base = await start();
    const res = await post(base, '/v1/art', { game: { title: 'nope' } });
    expect(res.status).toBe(400);
  });

  it('a mid-run provider failure surfaces as a terminal error event (stream already 200)', async () => {
    const base = await start({ provider: fromMap({}) }); // no fixtures → throws on first call
    const { status, events } = await post(base, '/v1/design', { numSeeds: 1 });
    expect(status).toBe(200);
    expect(events.at(-1)!.type).toBe('error');
  });

  it('does NOT abort a still-running phase once the request body is received (abort-on-disconnect regression)', async () => {
    // Several real-time LLM calls; the run is in-flight long after the small POST body arrives.
    const base = await start({ provider: slowProvider(designFixtures, 40) });
    const { events } = await post(base, '/v1/design', { numSeeds: 1 });
    // A premature `req.on('close')` abort would end this in `error` ("Request was aborted.").
    expect(events.at(-1)!.type).toBe('done');
  });

  it('aborts the in-flight run when the client actually disconnects mid-stream', async () => {
    let sawAbort = false;
    const base = await start({ provider: slowProvider(designFixtures, 1000, () => (sawAbort = true)) });

    const ctrl = new AbortController();
    const req = fetch(`${base}/v1/design`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ numSeeds: 1 }),
      signal: ctrl.signal,
    });
    await new Promise((r) => setTimeout(r, 120)); // let the first LLM call start
    ctrl.abort();
    await req.catch(() => {});
    await new Promise((r) => setTimeout(r, 100)); // let the server observe the disconnect
    expect(sawAbort).toBe(true);
  });

  it('enforces the bearer token on /v1 when configured, but leaves /health open', async () => {
    const base = await start({ provider: designProvider(), token: 'secret' });

    expect((await fetch(`${base}/health`)).status).toBe(200);

    const noAuth = await post(base, '/v1/design', { numSeeds: 1 });
    expect(noAuth.status).toBe(401);

    const withAuth = await post(base, '/v1/design', { numSeeds: 1 }, { authorization: 'Bearer secret' });
    expect(withAuth.status).toBe(200);
    expect(withAuth.events.at(-1)!.type).toBe('done');
  });
});
