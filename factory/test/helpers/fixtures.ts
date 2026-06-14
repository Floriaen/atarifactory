import type { Critique, GameDraft, Seed, Selection } from '../../src/contracts/phaseSchemas.js';
import type { GameDefinition } from '../../src/contracts/gameDefinition.js';

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
