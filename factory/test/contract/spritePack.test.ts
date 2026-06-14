import { describe, it, expect } from 'vitest';
import { parseSpritePack, type SpriteItem } from '../../src/contracts/spritePack.js';
import { SpriteDsl } from '../../src/contracts/artSchemas.js';
import { spritePackFixture } from '../helpers/fixtures.js';

const item = (): SpriteItem => structuredClone(spritePackFixture.items.player!);

describe('SpritePackV1 contract', () => {
  it('accepts a valid pack', () => {
    expect(() => parseSpritePack(spritePackFixture)).not.toThrow();
  });

  it('rejects unknown fields (strict)', () => {
    expect(() => parseSpritePack({ ...spritePackFixture, extra: true })).toThrow();
  });

  it('rejects a wrong schemaVersion', () => {
    expect(() => parseSpritePack({ ...spritePackFixture, schemaVersion: 'spritepack/v2' })).toThrow();
  });

  it('rejects a non-canonical EntityId key', () => {
    expect(() => parseSpritePack({ ...spritePackFixture, items: { Player1: item() } })).toThrow();
  });

  it('rejects a frame whose dims ≠ gridSize²', () => {
    const bad = item();
    bad.frames[0] = bad.frames[0]!.slice(0, bad.gridSize - 1); // one row short
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: bad } })).toThrow();
  });

  it('rejects a row whose width ≠ gridSize', () => {
    const bad = item();
    bad.frames[0]![0] = bad.frames[0]![0]!.slice(0, bad.gridSize - 1);
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: bad } })).toThrow();
  });

  it('rejects an empty (all-false) item', () => {
    const bad = item();
    bad.frames = [Array.from({ length: bad.gridSize }, () => Array.from({ length: bad.gridSize }, () => false))];
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: bad } })).toThrow();
  });

  it('rejects 0 frames and >3 frames', () => {
    const none = item();
    none.frames = [];
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: none } })).toThrow();

    const many = item();
    many.frames = [many.frames[0]!, many.frames[0]!, many.frames[0]!, many.frames[0]!];
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: many } })).toThrow();
  });

  it('rejects a gridSize out of range', () => {
    const small = item();
    small.gridSize = 4;
    expect(() => parseSpritePack({ ...spritePackFixture, items: { player: small } })).toThrow();
  });
});

describe('SpriteDsl contract', () => {
  it('accepts the 5 canonical ops', () => {
    const dsl = {
      gridSize: 12,
      frames: [{ ops: ['rect 0 0 4 4', 'oval 6 6 3 3', 'line 0 0 5 5', 'pixel 2 2', 'mirror H'] }],
    };
    expect(() => SpriteDsl.parse(dsl)).not.toThrow();
  });

  it('defaults gridSize to 12 when omitted', () => {
    const parsed = SpriteDsl.parse({ frames: [{ ops: ['pixel 6 6'] }] });
    expect(parsed.gridSize).toBe(12);
  });

  it('rejects a malformed op string', () => {
    expect(() => SpriteDsl.parse({ gridSize: 12, frames: [{ ops: ['triangle 1 2 3'] }] })).toThrow();
    expect(() => SpriteDsl.parse({ gridSize: 12, frames: [{ ops: ['rect 1 2 3'] }] })).toThrow(); // too few args
    expect(() => SpriteDsl.parse({ gridSize: 12, frames: [{ ops: ['mirror X'] }] })).toThrow(); // bad axis
  });

  it('rejects more than 3 frames and empty ops', () => {
    const f = { ops: ['pixel 6 6'] };
    expect(() => SpriteDsl.parse({ gridSize: 12, frames: [f, f, f, f] })).toThrow();
    expect(() => SpriteDsl.parse({ gridSize: 12, frames: [{ ops: [] }] })).toThrow();
  });
});
