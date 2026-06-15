import { createServer, type Server } from 'node:http';
import { chromium, type Browser, type Page } from 'playwright';
import type { GameBundle } from '@game-factory/contracts';

/**
 * The functions below run INSIDE the page (serialized by Playwright) in a DOM realm this
 * ES2022/Node build does not type. Rather than pull the DOM lib in program-wide (the factory is
 * deliberately DOM-free), we declare the handful of browser globals they touch as a loose,
 * MODULE-SCOPED ambient — visible only here.
 */
type RafCallback = (t: number) => void;
interface PageWindow {
  [key: string]: unknown;
  requestAnimationFrame: (cb: RafCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  addEventListener: (type: string, cb: (e: { message?: string; error?: unknown }) => void) => void;
  dispatchEvent: (event: unknown) => void;
  CustomEvent: new (type: string, init?: { detail?: unknown }) => unknown;
  CanvasRenderingContext2D?: { prototype: Record<string, unknown> };
  performance?: { now: () => number };
}
declare const window: PageWindow;

export type GamepadInputName = 'up' | 'down' | 'left' | 'right' | 'btn1' | 'btn2';

/** One scheduled gamepad action, applied just before the given frame is stepped. */
export interface GamepadStep {
  atFrame: number;
  press?: GamepadInputName[];
  release?: GamepadInputName[];
}

export interface SandboxOptions {
  /** Frames to run per pass (default 24). */
  frames?: number;
  /** Input sequence for the input pass (default: hold right+down+btn1 from frame 2). */
  inputSequence?: GamepadStep[];
  /** Overall wall-clock budget; on overrun the run reports `ok:false` (default 20s). */
  timeoutMs?: number;
}

/**
 * The result of loading + running a bundle headlessly.
 * - `ok` / `error`: did the IDLE pass load and run without throwing (the smoke floor).
 * - `idleDraws` / `inputDraws`: number of 2D-context draw ops in each pass.
 * - `interacted`: the input pass's entity-render trajectory differs from idle (the input did something).
 * - `movedEntities`: how many entities changed position over the input pass (something progresses).
 * - `usedEntities`: the entity ids passed to `renderEntity` (to cross-check the contract).
 */
export interface SandboxResult {
  ok: boolean;
  error?: string;
  idleDraws: number;
  inputDraws: number;
  interacted: boolean;
  movedEntities: number;
  usedEntities: string[];
}

const DEFAULT_FRAMES = 24;
const DEFAULT_SEQUENCE: GamepadStep[] = [{ atFrame: 2, press: ['right', 'down', 'btn1'] }];

interface EntityHit {
  id: string;
  x: number;
  y: number;
}
interface PassData {
  drawCount: number;
  entityFrames: EntityHit[][];
  used: string[];
  error: string | null;
}

// Runs in the page BEFORE any bundle script: seed time/RNG/rAF for reproducibility and instrument
// the 2D context + error reporting. rAF is QUEUED (not auto-run) so the host drives frames deterministically.
function seedAndInstrument(): void {
  window.__now = 0;
  Date.now = () => window.__now as number;
  if (window.performance) window.performance.now = () => window.__now as number;

  let seed = 0x2545f485;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  window.__rafQueue = [];
  let rafId = 0;
  window.requestAnimationFrame = (cb: RafCallback) => {
    (window.__rafQueue as RafCallback[]).push(cb);
    return ++rafId;
  };
  window.cancelAnimationFrame = () => {};

  window.__drawCount = 0;
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (proto && !proto.__wrapped) {
    proto.__wrapped = true;
    for (const m of ['fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage', 'fill', 'stroke', 'clearRect']) {
      const orig = proto[m];
      if (typeof orig === 'function') {
        proto[m] = function (this: unknown, ...args: unknown[]) {
          window.__drawCount = (window.__drawCount as number) + 1;
          return (orig as (...a: unknown[]) => unknown).apply(this, args);
        };
      }
    }
  }

  window.__error = null;
  window.addEventListener('error', (e) => {
    if (!window.__error) window.__error = String(e.message || e.error);
  });
}

// Wrap renderEntity (defined by spriteRuntime.js) to record per-frame entity positions.
function wrapRenderEntity(): void {
  window.__entityFrames = [];
  window.__currentFrame = null;
  window.__used = {};
  const orig = window.renderEntity;
  if (typeof orig === 'function') {
    window.renderEntity = function (this: unknown, ctx: unknown, id: string, x: number, y: number, ...rest: unknown[]) {
      const cur = window.__currentFrame as Array<{ id: string; x: number; y: number }> | null;
      if (cur) cur.push({ id, x, y });
      (window.__used as Record<string, boolean>)[id] = true;
      return (orig as (...a: unknown[]) => unknown).apply(this, [ctx, id, x, y, ...rest]);
    };
  }
}

async function stepFrames(page: Page, frames: number, sequence: GamepadStep[]): Promise<void> {
  for (let f = 0; f < frames; f++) {
    const events: Array<{ type: string; input: string }> = [];
    for (const step of sequence) {
      if (step.atFrame !== f) continue;
      for (const input of step.press ?? []) events.push({ type: 'gamepad-press', input });
      for (const input of step.release ?? []) events.push({ type: 'gamepad-release', input });
    }
    await page.evaluate((evs) => {
      for (const ev of evs) window.dispatchEvent(new window.CustomEvent(ev.type, { detail: { input: ev.input } }));
      window.__currentFrame = [];
      window.__now = (window.__now as number) + 16;
      const q = window.__rafQueue as RafCallback[];
      window.__rafQueue = [];
      for (const cb of q) {
        try {
          cb(window.__now as number);
        } catch (err) {
          if (!window.__error) window.__error = String((err as Error)?.message ?? err);
        }
      }
      (window.__entityFrames as unknown[]).push(window.__currentFrame);
      window.__currentFrame = null;
    }, events);
  }
}

async function runPass(browser: Browser, url: string, frames: number, sequence: GamepadStep[]): Promise<PassData> {
  const page = await browser.newPage({ viewport: { width: 390, height: 760 } });
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  try {
    await page.addInitScript(seedAndInstrument);
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.evaluate(wrapRenderEntity);
    await stepFrames(page, frames, sequence);
    const data = (await page.evaluate(() => ({
      drawCount: window.__drawCount as number,
      entityFrames: window.__entityFrames,
      used: Object.keys(window.__used as Record<string, boolean>),
      error: window.__error as string | null,
    }))) as PassData;
    // window.onerror is sanitised to "Script error." for cross-origin file:// scripts (a load-time
    // throw), losing the real message. Playwright's pageerror carries the true message + stack
    // regardless of origin — prefer it whenever the page's own error is missing or masked. In-frame
    // throws are already captured with their real message in stepFrames, so a real window.__error stands.
    if (pageErrors.length && (data.error == null || data.error === 'Script error.')) {
      data.error = pageErrors[0] ?? data.error;
    }
    return data;
  } finally {
    await page.close();
  }
}

function signature(entityFrames: EntityHit[][]): string {
  return entityFrames
    .map((frame) => frame.map((e) => `${e.id}:${Math.round(e.x)},${Math.round(e.y)}`).join('|'))
    .join(';');
}

function countMoved(entityFrames: EntityHit[][]): number {
  const first = new Map<string, EntityHit>();
  const last = new Map<string, EntityHit>();
  for (const frame of entityFrames) {
    for (const e of frame) {
      if (!first.has(e.id)) first.set(e.id, e);
      last.set(e.id, e);
    }
  }
  let moved = 0;
  for (const [id, a] of first) {
    const b = last.get(id)!;
    if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) moved += 1;
  }
  return moved;
}

function contentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

/**
 * Serve the bundle's files over a loopback HTTP server (random port) so the page and its scripts are
 * SAME-ORIGIN. Loading over `file://` makes every external script cross-origin, which makes Chromium
 * sanitise thrown errors to the useless "Script error." — hiding the real cause from the gate and the
 * repair loop. Same-origin HTTP gives `window.onerror` the true message + stack.
 */
async function serveBundle(bundle: GameBundle): Promise<{ server: Server; baseUrl: string }> {
  const byPath = new Map(bundle.files.map((f) => [f.path, f.contents]));
  const server = createServer((req, res) => {
    const name = (req.url ?? '/').split('?')[0]!.replace(/^\/+/, '') || bundle.entry;
    const body = byPath.get(name);
    if (body == null) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', contentType(name));
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, baseUrl: `http://127.0.0.1:${port}/` };
}

/**
 * Load an assembled bundle in real headless Chromium and run two seeded passes — idle, then a
 * scripted gamepad sequence — recording draws and entity motion. A real browser (not a node:vm
 * stub) is used deliberately: generated code reaches for unpredictable canvas/DOM APIs, and every
 * missing one would be a false reject of a good game.
 */
export async function runSandbox(bundle: GameBundle, opts: SandboxOptions = {}): Promise<SandboxResult> {
  const frames = opts.frames ?? DEFAULT_FRAMES;
  const sequence = opts.inputSequence ?? DEFAULT_SEQUENCE;
  const timeoutMs = opts.timeoutMs ?? 20000;

  let server: Server | undefined;
  let browser: Browser | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const served = await serveBundle(bundle);
    server = served.server;
    const url = served.baseUrl + bundle.entry;

    browser = await chromium.launch();
    const active = browser;

    const work = (async (): Promise<SandboxResult> => {
      const idle = await runPass(active, url, frames, []);
      const input = await runPass(active, url, frames, sequence);
      const used = Array.from(new Set([...idle.used, ...input.used]));
      return {
        ok: !idle.error,
        ...(idle.error ? { error: idle.error } : {}),
        idleDraws: idle.drawCount,
        inputDraws: input.drawCount,
        interacted: signature(idle.entityFrames) !== signature(input.entityFrames),
        movedEntities: countMoved(input.entityFrames),
        usedEntities: used,
      };
    })();
    work.catch(() => {}); // a runaway game can leave `work` rejecting after the deadline fires — ignore it.

    // Bound arbitrary generated code: an infinite loop inside a frame must not hang the gate.
    const deadline = new Promise<SandboxResult>((resolve) => {
      timer = setTimeout(
        () => resolve({ ok: false, error: 'sandbox timeout', idleDraws: 0, inputDraws: 0, interacted: false, movedEntities: 0, usedEntities: [] }),
        timeoutMs,
      );
    });

    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    await browser?.close();
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
}
