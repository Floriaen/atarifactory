import { describe, it, expect } from 'vitest';
import { checkSyntax, lintGameJs, gate } from '../../src/coding/gate.js';
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
