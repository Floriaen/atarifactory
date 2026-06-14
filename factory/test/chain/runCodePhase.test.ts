import { describe, it, expect } from 'vitest';
import { fromMap } from '../../src/llm/providers/mock.js';
import { runCodePhase } from '../../src/coding/runCodePhase.js';
import { parseGameBundle } from '../../src/contracts/gameBundle.js';
import { testObserver } from '../helpers/observer.js';
import {
  codeReviewPass,
  codeReviewRevise,
  gameCodeFixture,
  validGame,
  validSpritePack,
} from '../helpers/fixtures.js';
import { chromiumAvailable } from '../coding/chromium.js';

// A game.js that runs and lints clean but ignores input (reads gamepadState, never acts on it) —
// passes the hard floor, fails interaction/progression.
const DEAD_BUT_RUNNING = `const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gp = window.gamepadState;
function loop() {
  void gp;
  drawBackground(ctx);
  renderEntity(ctx, 'player', 50, 50, 2, '#ffffff', 0);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;

const fixNodes = (observer: ReturnType<typeof testObserver>['observer']): string[] =>
  observer.timings.map((t) => t.node).filter((n) => n.startsWith('code:fix'));

// The throw case never launches a browser (syntax fails before the sandbox), so it always runs.
describe('runCodePhase (mock) — fail-loud', () => {
  it('throws when no loading bundle can be produced (syntax broken even after the fix)', async () => {
    const broken = { js: 'const a = (' };
    const provider = fromMap({ codeGen: broken, codeFix: broken });
    const { observer } = testObserver();

    await expect(
      runCodePhase(validGame, validSpritePack, { provider, observer, maxIterations: 1 }),
    ).rejects.toThrow(/no loading bundle/);
  }, 30000);
});

const hasChromium = await chromiumAvailable();
const browser = hasChromium ? describe : describe.skip;

browser('runCodePhase (mock) — real gate', () => {
  it('a good game generates, passes the gate, and emits one code:generate node', async () => {
    const provider = fromMap({ codeGen: gameCodeFixture, codeReview: codeReviewPass });
    const { observer } = testObserver();

    const { bundle, report } = await runCodePhase(validGame, validSpritePack, { provider, observer });

    expect(report.passed).toBe(true);
    expect(() => parseGameBundle(bundle)).not.toThrow();
    expect(bundle.files.map((f) => f.path)).toContain('sprites.data.js');
    expect(bundle.files.find((f) => f.path === 'sprites.data.js')!.contents).toContain('player');

    const nodes = observer.timings.map((t) => t.node);
    expect(nodes.filter((n) => n === 'code:generate')).toHaveLength(1);
    expect(fixNodes(observer)).toHaveLength(0);
  }, 60000);

  it('a dead-on-input first cut is fixed once, then passes; keep-best returns the good one', async () => {
    const provider = fromMap({
      codeGen: { js: DEAD_BUT_RUNNING },
      codeFix: gameCodeFixture,
      codeReview: codeReviewPass,
    });
    const { observer } = testObserver();

    const { bundle, report } = await runCodePhase(validGame, validSpritePack, { provider, observer });

    expect(report.passed).toBe(true);
    expect(fixNodes(observer)).toEqual(['code:fix#1']);
    // keep-best kept the fixed (good) candidate, not the dead first cut.
    expect(bundle.files.find((f) => f.path === 'game.js')!.contents).toBe(gameCodeFixture.js);
  }, 60000);

  it('a faithfulness "revise" then "pass" drives exactly one fix, then passes', async () => {
    let reviewCalls = 0;
    const provider = fromMap({
      codeGen: gameCodeFixture,
      codeFix: gameCodeFixture,
      codeReview: () => (reviewCalls++ === 0 ? codeReviewRevise : codeReviewPass),
    });
    const { observer } = testObserver();

    const { report } = await runCodePhase(validGame, validSpritePack, { provider, observer });

    expect(report.passed).toBe(true);
    expect(report.checks.faithful).toBe(true);
    expect(fixNodes(observer)).toEqual(['code:fix#1']);
  }, 60000);

  it('a persistently sub-bar-but-running game returns {bundle, report} with passed:false (no throw)', async () => {
    const provider = fromMap({
      codeGen: { js: DEAD_BUT_RUNNING },
      codeFix: { js: DEAD_BUT_RUNNING },
      codeReview: codeReviewPass,
    });
    const { observer } = testObserver();

    const { bundle, report } = await runCodePhase(validGame, validSpritePack, {
      provider,
      observer,
      maxIterations: 2,
    });

    expect(report.passed).toBe(false);
    expect(report.checks.syntax && report.checks.lint && report.checks.smoke).toBe(true); // floor holds
    expect(report.checks.interaction).toBe(false);
    expect(() => parseGameBundle(bundle)).not.toThrow();
    expect(fixNodes(observer)).toEqual(['code:fix#1', 'code:fix#2']);
  }, 90000);
});
