import { describe, it, expect, vi } from 'vitest';
import { drawSprite } from '../../../utils/sprites/renderer.js';

function makeMask12(fill=true) {
  const s = 12;
  const frame = Array.from({ length: s }, () => Array.from({ length: s }, () => false));
  if (fill) {
    // simple plus sign
    for (let x = 2; x < 10; x++) frame[6][x] = true;
    for (let y = 2; y < 10; y++) frame[y][6] = true;
  }
  return { gridSize: s, frames: [frame] };
}

describe('drawSprite', () => {
  it('fills rects at scaled pixel positions', () => {
    const mask = makeMask12(true);
    const calls = [];
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '#fff',
      fillRect: (...args) => calls.push(args)
    };
    drawSprite(ctx, mask, '#ffd34e', 0, 0, 3, 0);
    expect(calls.length).toBeGreaterThan(0);
    // ensure scale 3 used
    const anyScaled = calls.some(([, , w, h]) => w === 3 && h === 3);
    expect(anyScaled).toBe(true);
  });
});

