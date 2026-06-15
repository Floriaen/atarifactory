import type { Critique, GameDraft, Seed, Selection } from '@game-factory/contracts';
import type { GameDefinition } from '@game-factory/contracts';
import type { SpriteDsl } from '@game-factory/contracts';
import type { SpritePack } from '@game-factory/contracts';
import type { GameCode, CodeReview } from '@game-factory/contracts';
import type { GameBundle } from '@game-factory/contracts';
import { compileSprite } from '../../src/art/compiler.js';

export const validGame: GameDefinition = {
  schemaVersion: 'gamedef/v1',
  title: 'Upstack',
  description: 'Stack blocks that fall upward before they hit the ceiling.',
  coreVerb: 'stack',
  hook: 'gravity is inverted — blocks fall up',
  loop: 'Catch and place rising blocks before the stack reaches the top.',
  mechanics: [{ name: 'place', description: 'drop a block into a column' }],
  entities: [
    { id: 'block', role: 'obstacle', description: 'a rising block' },
    { id: 'player', role: 'player', description: 'the placement cursor' },
  ],
  goal: { type: 'score', description: 'score points by completing rows' },
  controls: { scheme: 'gamepad', bindings: [{ input: 'btn1', action: 'drop the block' }] },
  spatial: { usesFullScreen: true, orientation: 'portrait' },
  estimatedPlaytimeSec: 90,
};

export const seedFixture: Seed = {
  coreVerb: 'stack',
  hook: 'gravity is inverted — blocks fall up',
  goalMode: 'score',
  whyFun: 'every placement is a small panic',
  persona: 'minimalist',
};

export const selectionFixture: Selection = { ranking: [0, 1], reason: 'tightest hook' };

export const draftFixture: GameDraft = {
  title: 'Upstack',
  description: 'Stack blocks that fall upward before they hit the ceiling.',
  coreVerb: 'stack',
  hook: 'gravity is inverted — blocks fall up',
  loop: 'Catch and place rising blocks before the stack reaches the top.',
  mechanics: [{ name: 'place', description: 'drop a block into a column' }],
  entities: [
    { id: 'block', role: 'obstacle', description: 'a rising block' },
    { id: 'player', role: 'player', description: 'the placement cursor' },
  ],
  goal: { type: 'score', description: 'score points by completing rows' },
  controls: { scheme: 'gamepad', bindings: [{ input: 'btn1', action: 'drop the block' }] },
  orientation: 'portrait',
  estimatedPlaytimeSec: 90,
};

export const passCritique: Critique = { verdict: 'pass', resembles: '', funNote: 'snappy', issues: [] };

export const reviseMedium: Critique = {
  verdict: 'revise',
  resembles: 'Tetris',
  funNote: 'too familiar',
  issues: [{ target: 'hook', severity: 'medium', note: 'too close to Tetris — push the inversion further' }],
};

/** A valid SpriteDsl: a single connected, symmetric blob. */
export const spriteDslFixture: SpriteDsl = {
  gridSize: 12,
  frames: [{ ops: ['rect 4 4 4 4', 'mirror H'] }],
};

/** A valid SpritePack, with frames compiled from the DSL fixture (so dims/pixels are real). */
const spriteItemFixture = (() => {
  const compiled = compileSprite(spriteDslFixture);
  return { gridSize: compiled.gridSize, frames: compiled.frames, dsl: spriteDslFixture };
})();

export const spritePackFixture: SpritePack = {
  schemaVersion: 'spritepack/v1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  items: { player: spriteItemFixture },
};

/** A pack covering every entity in `validGame` (block, player) — what M3 consumes. */
export const validSpritePack: SpritePack = {
  schemaVersion: 'spritepack/v1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  items: { player: spriteItemFixture, block: spriteItemFixture },
};

/**
 * A good, contract-respecting `game.js` for `validGame`: reads `window.gamepadState`,
 * renders the canonical entity ids, moves the player under left/right input, drives the
 * loop with rAF, paints via `drawBackground` (no full-canvas clear of its own), and has a
 * win state for the `score` goal. Runs/responds/progresses — the gate's happy path.
 */
export const gameCodeFixture: GameCode = {
  summary: 'move the cursor under falling blocks; score 5 to win',
  js: `const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const scale = 3;
const player = { x: Math.floor(W / 2), y: H - 40 };
const blocks = [{ x: 40, y: 0 }, { x: 120, y: 60 }];
let score = 0;
let won = false;

function update() {
  const gp = window.gamepadState;
  if (gp.left) player.x -= 4;
  if (gp.right) player.x += 4;
  if (gp.btn1) player.y -= 2;
  if (player.x < 0) player.x = 0;
  if (player.x > W) player.x = W;
  for (const b of blocks) {
    b.y += 2;
    if (b.y > H) { b.y = 0; score += 1; }
  }
  if (score >= 5) won = true;
}

function render() {
  drawBackground(ctx);
  for (const b of blocks) renderEntity(ctx, 'block', b.x, b.y, scale, '#ff4040', 0);
  renderEntity(ctx, 'player', player.x, player.y, scale, '#ffffff', 0);
}

function loop() {
  if (!won) { update(); render(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`,
};

/** The faithfulness reviewer's happy verdict. */
export const codeReviewPass: CodeReview = { verdict: 'pass', issues: [] };

/** The faithfulness reviewer asking for one change. */
export const codeReviewRevise: CodeReview = {
  verdict: 'revise',
  issues: [{ target: 'goal', note: 'no win condition is implemented for the score goal' }],
};

/** A structurally valid GameBundle (hand-built — exercises the contract directly). */
export const gameBundleFixture: GameBundle = {
  schemaVersion: 'gamebundle/v1',
  generatedAt: '2026-01-01T00:00:00.000Z',
  gameId: 'upstack',
  entry: 'index.html',
  files: [
    { path: 'index.html', contents: '<!doctype html><title>Upstack</title>' },
    { path: 'controlBar.js', contents: '// control bar' },
    { path: 'sprites.data.js', contents: 'window.spritePack = {};' },
    { path: 'game.js', contents: gameCodeFixture.js },
  ],
};
