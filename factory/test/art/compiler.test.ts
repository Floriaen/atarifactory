import { describe, it, expect } from 'vitest';
import { compileSprite } from '../../src/art/compiler.js';
import type { SpriteDsl } from '../../src/contracts/artSchemas.js';

/** Compile one frame of ops at a given grid size and return the mask. */
function frame(ops: string[], gridSize = 12): boolean[][] {
  const dsl: SpriteDsl = { gridSize, frames: [{ ops }] };
  return compileSprite(dsl).frames[0]!;
}

const count = (f: boolean[][]): number => f.reduce((s, row) => s + row.filter(Boolean).length, 0);

describe('compileSprite — drawing ops', () => {
  it('rect fills the in-band block exactly', () => {
    // 16px / 144 = 0.11 → in [0.08, 0.40], so post-process is identity.
    const f = frame(['rect 2 2 4 4']);
    expect(f[2]![2]).toBe(true);
    expect(f[5]![5]).toBe(true);
    expect(f[1]![1]).toBe(false);
    expect(f[6]![6]).toBe(false);
    expect(count(f)).toBe(16);
  });

  it('oval fills a connected disc', () => {
    const f = frame(['oval 6 6 3 3']);
    expect(f[6]![6]).toBe(true); // centre
    expect(f[6]![3]).toBe(true); // left edge (cx-rx)
    expect(f[6]![9]).toBe(true); // right edge (cx+rx)
    expect(f[0]![0]).toBe(false);
  });

  it('line draws a connected run (all drawn pixels survive)', () => {
    const f = frame(['line 6 2 6 9']); // vertical line, dilated for density but never erased
    for (let y = 2; y <= 9; y++) expect(f[y]![6]).toBe(true);
  });

  it('pixel at low density gets dilated into a plus', () => {
    const f = frame(['pixel 6 6']);
    expect(f[6]![6]).toBe(true);
    expect(f[5]![6]).toBe(true);
    expect(f[7]![6]).toBe(true);
    expect(f[6]![5]).toBe(true);
    expect(f[6]![7]).toBe(true);
  });

  it('mirror H reflects across the vertical centre line', () => {
    const f = frame(['rect 3 4 4 4', 'mirror H']); // covers x3..6, mirror adds x7,x8
    expect(f[4]![7]).toBe(true);
    expect(f[4]![8]).toBe(true);
    expect(f[4]![3]).toBe(f[4]![8]); // symmetric
    expect(f[5]![3]).toBe(f[5]![8]);
  });
});

describe('compileSprite — post-process', () => {
  it('keeps only the largest connected component (drops a stray pixel)', () => {
    const f = frame(['rect 2 2 4 4', 'pixel 11 11']);
    expect(f[2]![2]).toBe(true);
    expect(f[11]![11]).toBe(false); // stray, disconnected → dropped
    expect(count(f)).toBe(16);
  });

  it('thins out when density exceeds 40%', () => {
    const f = frame(['rect 1 1 8 8']); // 64/144 = 0.44 → thin (keep x even && y even)
    expect(f[2]![2]).toBe(true); // even,even kept
    expect(f[1]![1]).toBe(false); // odd,odd dropped
    expect(f[2]![3]).toBe(false); // odd x dropped
    expect(count(f)).toBeLessThan(64);
  });

  it('dilates once when density is below 8%', () => {
    const f = frame(['rect 5 5 3 3']); // 9/144 = 0.0625 → dilate once
    expect(f[5]![5]).toBe(true);
    expect(f[4]![5]).toBe(true); // grew upward
    expect(count(f)).toBeGreaterThan(9);
  });

  it('falls back to a centre pixel for an empty frame', () => {
    const f = frame(['rect 0 0 0 0']); // draws nothing
    expect(count(f)).toBe(1);
    expect(f[6]![6]).toBe(true);
  });
});
