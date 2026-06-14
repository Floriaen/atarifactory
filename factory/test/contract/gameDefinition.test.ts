import { describe, it, expect } from 'vitest';
import { parseGameDefinition } from '../../src/contracts/gameDefinition.js';
import { validGame } from '../helpers/fixtures.js';

describe('GameDefinitionV1 contract', () => {
  it('accepts a valid definition', () => {
    expect(() => parseGameDefinition(validGame)).not.toThrow();
  });

  it('rejects unknown fields (strict) — e.g. legacy `name`', () => {
    expect(() => parseGameDefinition({ ...validGame, name: 'Upstack' })).toThrow();
  });

  it('rejects more than 2 mechanics', () => {
    const m = validGame.mechanics[0]!;
    expect(() => parseGameDefinition({ ...validGame, mechanics: [m, m, m] })).toThrow();
  });

  it('rejects more than 3 entities', () => {
    const e = validGame.entities[0]!;
    expect(() =>
      parseGameDefinition({
        ...validGame,
        entities: [
          { ...e, id: 'aa' },
          { ...e, id: 'bb' },
          { ...e, id: 'cc' },
          { ...e, id: 'dd' },
        ],
      }),
    ).toThrow();
  });

  it('rejects non-canonical EntityId', () => {
    expect(() =>
      parseGameDefinition({
        ...validGame,
        entities: [{ id: 'Player1', role: 'player', description: 'x' }],
      }),
    ).toThrow();
  });

  it('rejects duplicate entity ids', () => {
    expect(() =>
      parseGameDefinition({
        ...validGame,
        entities: [
          { id: 'block', role: 'obstacle', description: 'a' },
          { id: 'block', role: 'player', description: 'b' },
        ],
      }),
    ).toThrow();
  });

  it('supports the goal discriminated union', () => {
    const reach = { ...validGame, goal: { type: 'reach', target: 'the exit', description: 'get out' } };
    expect(() => parseGameDefinition(reach)).not.toThrow();
    const survive = { ...validGame, goal: { type: 'survive', forSeconds: 60, description: 'last a minute' } };
    expect(() => parseGameDefinition(survive)).not.toThrow();
  });

  it('requires full-screen', () => {
    expect(() =>
      parseGameDefinition({ ...validGame, spatial: { usesFullScreen: false, orientation: 'portrait' } }),
    ).toThrow();
  });

  it('rejects legacy free-text controls', () => {
    expect(() => parseGameDefinition({ ...validGame, controls: 'tap to drop' })).toThrow();
  });

  it('rejects a non-gamepad input (e.g. swipe/tap)', () => {
    expect(() =>
      parseGameDefinition({
        ...validGame,
        controls: { scheme: 'gamepad', bindings: [{ input: 'swipe', action: 'aim' }] },
      }),
    ).toThrow();
  });

  it('rejects duplicate gamepad inputs', () => {
    expect(() =>
      parseGameDefinition({
        ...validGame,
        controls: {
          scheme: 'gamepad',
          bindings: [
            { input: 'btn1', action: 'jump' },
            { input: 'btn1', action: 'shoot' },
          ],
        },
      }),
    ).toThrow();
  });
});
