import { describe, it, expect } from 'vitest';
import { checkSyntax, syntaxError, lintGameJs, gate } from '../../src/coding/gate.js';
import { assembleGameBundle } from '../../src/coding/assembleGameBundle.js';
import { fromMap } from '../../src/llm/providers/mock.js';
import { testObserver } from '../helpers/observer.js';
import { codeReviewPass, gameCodeFixture, validGame, validSpritePack } from '../helpers/fixtures.js';
import { chromiumAvailable } from './chromium.js';

const ENTITY_IDS = validGame.entities.map((e) => e.id); // ['block', 'player']

describe('gate static checks (no browser)', () => {
  it('checkSyntax accepts valid code and rejects a SyntaxError', () => {
    expect(checkSyntax(gameCodeFixture.js)).toBe(true);
    expect(checkSyntax('const a = (;')).toBe(false);
  });

  it('syntaxError returns the compiler message for broken code (e.g. truncation), null when valid', () => {
    expect(syntaxError(gameCodeFixture.js)).toBeNull();
    const msg = syntaxError("const s = 'unterminated"); // a truncated string literal
    expect(typeof msg).toBe('string');
    expect(msg).toBeTruthy();
  });

  it('passes a clean, contract-respecting game.js', () => {
    expect(lintGameJs(gameCodeFixture.js, ENTITY_IDS)).toEqual([]);
  });

  it('flags forbidden APIs', () => {
    const issues = lintGameJs("eval('x'); fetch('/y'); gamepadState; renderEntity(ctx,'player',0,0,1,'#fff',0);", ENTITY_IDS);
    expect(issues.some((i) => /eval/.test(i))).toBe(true);
    expect(issues.some((i) => /fetch/.test(i))).toBe(true);
  });

  it('flags a full-canvas clear', () => {
    const issues = lintGameJs("ctx.clearRect(0,0,canvas.width,canvas.height); gamepadState; renderEntity(ctx,'player',0,0,1,'#fff',0);", ENTITY_IDS);
    expect(issues.some((i) => /clearRect/.test(i))).toBe(true);
  });

  it('flags an unknown entity id passed to renderEntity', () => {
    const issues = lintGameJs("gamepadState; renderEntity(ctx, 'ghost', 0, 0, 1, '#fff', 0);", ENTITY_IDS);
    expect(issues.some((i) => /ghost/.test(i))).toBe(true);
  });

  it('flags missing gamepadState and renderEntity usage', () => {
    const issues = lintGameJs('const x = 1;', ENTITY_IDS);
    expect(issues.some((i) => /gamepadState/.test(i))).toBe(true);
    expect(issues.some((i) => /renderEntity/.test(i))).toBe(true);
  });
});

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

browser('gate full report (real Chromium)', () => {
  it('a good game passes every check', async () => {
    const bundle = await assembleGameBundle(validGame, validSpritePack, gameCodeFixture.js);
    const provider = fromMap({ codeReview: codeReviewPass });
    const { observer } = testObserver();

    const report = await gate({ game: validGame, js: gameCodeFixture.js, bundle }, { provider, observer });

    expect(report.checks.syntax).toBe(true);
    expect(report.checks.lint).toBe(true);
    expect(report.checks.smoke).toBe(true);
    expect(report.checks.interaction).toBe(true);
    expect(report.checks.progression).toBe(true);
    expect(report.checks.faithful).toBe(true);
    expect(report.passed).toBe(true);
    expect(report.issues).toEqual([]);
  }, 30000);

  it('a game that loads but draws nothing fails the floor (blank screen, like the canvas-id bug)', async () => {
    // Passes lint (mentions gamepadState + renderEntity) and never throws, but schedules no frame
    // and runs no draw op — the Apogee failure mode: wrong canvas id, early return, blank screen.
    const blankJs = "const gp = window.gamepadState;\nif (false) { renderEntity(ctx, 'player', 0, 0, 1, '#fff', 0); }\n";
    const bundle = await assembleGameBundle(validGame, validSpritePack, blankJs);
    let reviewed = false;
    const provider = fromMap({ codeReview: () => { reviewed = true; return codeReviewPass; } });
    const { observer } = testObserver();

    const report = await gate({ game: validGame, js: blankJs, bundle }, { provider, observer });

    expect(report.checks.syntax).toBe(true);
    expect(report.checks.lint).toBe(true);
    expect(report.checks.smoke).toBe(false); // loaded fine, but rendered nothing
    expect(report.passed).toBe(false);
    expect(report.issues.some((i) => /drew nothing|blank|no.*draw/i.test(i))).toBe(true);
    expect(reviewed).toBe(false); // floor failed → no Opus review
  }, 30000);

  it('a forbidden-API game fails the hard floor and never reaches the review', async () => {
    const badJs = gameCodeFixture.js + "\nfetch('https://example.com');\n";
    const bundle = await assembleGameBundle(validGame, validSpritePack, badJs);
    let reviewed = false;
    const provider = fromMap({ codeReview: () => { reviewed = true; return codeReviewPass; } });
    const { observer } = testObserver();

    const report = await gate({ game: validGame, js: badJs, bundle }, { provider, observer });

    expect(report.checks.lint).toBe(false);
    expect(report.passed).toBe(false);
    expect(reviewed).toBe(false); // faithfulness is skipped when the hard floor fails
  }, 30000);
});
