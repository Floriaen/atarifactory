import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { chromiumAvailable } from './chromium.js';

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

const controlBarJs = readFileSync(new URL('../../src/coding/templates/controlBar.js', import.meta.url), 'utf8');

// The evaluate() callbacks run INSIDE the page (Playwright-serialized) in a DOM realm this
// DOM-free Node build doesn't type. Declare the handful of browser globals they touch as a
// loose, module-scoped ambient — mirrors src/coding/sandbox.ts.
declare const window: { gamepadState: Record<string, boolean>; dispatchEvent(e: unknown): void };
declare const document: { querySelector(s: string): { classList: { contains(c: string): boolean } } | null };
declare const KeyboardEvent: new (
  type: string,
  init: { code: string; cancelable: boolean; bubbles: boolean },
) => { defaultPrevented: boolean };

// Load just the gamepad template into a page with the #control-bar host, then dispatch a real
// KeyboardEvent and read back the single source of truth (window.gamepadState) + defaultPrevented.
async function withPage<T>(fn: (dispatch: Dispatch) => Promise<T>): Promise<T> {
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    await page.setContent(`<div id="control-bar"></div><script>${controlBarJs}</script>`);
    const dispatch: Dispatch = (type, code) =>
      page.evaluate(
        ([type, code]) => {
          const e = new KeyboardEvent(type, { code, cancelable: true, bubbles: true });
          window.dispatchEvent(e);
          const input = { ArrowUp: 'up', KeyZ: 'btn1' }[code as string];
          const btn = input ? document.querySelector('.gp-' + input) : null;
          return {
            prevented: e.defaultPrevented,
            state: { ...window.gamepadState },
            on: btn ? btn.classList.contains('on') : false,
          };
        },
        [type, code] as const,
      );
    return await fn(dispatch);
  } finally {
    await b.close();
  }
}

type Dispatch = (type: 'keydown' | 'keyup', code: string) => Promise<{
  prevented: boolean;
  state: Record<string, boolean>;
  on: boolean;
}>;

browser('controlBar keyboard input', () => {
  it('ArrowUp keydown presses up, calls preventDefault, lights the button; keyup releases', async () => {
    await withPage(async (dispatch) => {
      const down = await dispatch('keydown', 'ArrowUp');
      expect(down.state.up).toBe(true);
      expect(down.prevented).toBe(true);
      expect(down.on).toBe(true);

      const up = await dispatch('keyup', 'ArrowUp');
      expect(up.state.up).toBe(false);
      expect(up.on).toBe(false);
    });
  }, 30000);

  it('KeyZ maps to btn1', async () => {
    await withPage(async (dispatch) => {
      expect((await dispatch('keydown', 'KeyZ')).state.btn1).toBe(true);
      expect((await dispatch('keyup', 'KeyZ')).state.btn1).toBe(false);
    });
  }, 30000);

  it('an unmapped key is ignored and not prevented', async () => {
    await withPage(async (dispatch) => {
      const r = await dispatch('keydown', 'KeyQ');
      expect(r.prevented).toBe(false);
      expect(Object.values(r.state).some(Boolean)).toBe(false);
    });
  }, 30000);
});
