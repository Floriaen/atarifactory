import type { SpriteDsl } from '../contracts/artSchemas.js';

/**
 * The art analogue of `assembleGameDefinition`: pure, deterministic, no LLM.
 * A faithful typed port of the prototype's SpriteDSL compiler — it renders a
 * validated DSL to boolean pixel masks, then post-processes each frame for a
 * single clean silhouette. Ops are already validated at the schema boundary;
 * the compiler only clamps in-range-but-oversized coordinates.
 */

export interface CompiledSprite {
  gridSize: number;
  frames: boolean[][][];
}

const MIN_FILL_RATIO = 0.08; // below → dilate once
const MAX_FILL_RATIO = 0.4; // above → thin out

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function emptyGrid(s: number): boolean[][] {
  return Array.from({ length: s }, () => Array.from({ length: s }, () => false));
}

function setPx(grid: boolean[][], x: number, y: number, s: number): void {
  if (x >= 0 && y >= 0 && x < s && y < s) grid[y]![x] = true;
}

export function compileSprite(dsl: SpriteDsl): CompiledSprite {
  const s = dsl.gridSize;
  const frames: boolean[][][] = dsl.frames.map((frame) => {
    const grid = emptyGrid(s);
    drawOps(grid, frame.ops, s);
    const processed = postProcessFrame(grid, s);
    // Empty-mask fallback: guarantees the contract's ≥1-pixel refine never fails
    // the phase on one bad frame.
    if (!processed.some((row) => row.some(Boolean))) {
      const c = Math.floor(s / 2);
      processed[c]![c] = true;
    }
    return processed;
  });
  return { gridSize: s, frames };
}

function drawOps(grid: boolean[][], ops: string[], s: number): void {
  for (const raw of ops) {
    const parts = raw.trim().split(/\s+/);
    const op = (parts[0] ?? '').toLowerCase();
    const a = parts.slice(1).map((v) => parseInt(v, 10) || 0);
    switch (op) {
      case 'rect': {
        const x = clamp(a[0] ?? 0, 0, s - 1);
        const y = clamp(a[1] ?? 0, 0, s - 1);
        const w = clamp(a[2] ?? 0, 0, s);
        const h = clamp(a[3] ?? 0, 0, s);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) setPx(grid, x + xx, y + yy, s);
        break;
      }
      case 'pixel': {
        setPx(grid, clamp(a[0] ?? 0, 0, s - 1), clamp(a[1] ?? 0, 0, s - 1), s);
        break;
      }
      case 'line': {
        let x0 = clamp(a[0] ?? 0, 0, s - 1);
        let y0 = clamp(a[1] ?? 0, 0, s - 1);
        const x1 = clamp(a[2] ?? 0, 0, s - 1);
        const y1 = clamp(a[3] ?? 0, 0, s - 1);
        const dx = Math.abs(x1 - x0);
        const sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0);
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          setPx(grid, x0, y0, s);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x0 += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y0 += sy;
          }
        }
        break;
      }
      case 'oval': {
        const rxRaw = a[2] ?? 0;
        const ryRaw = a[3] ?? 0;
        const rx = clamp(rxRaw, 1, s);
        const ry = clamp(ryRaw || rx, 1, s);
        const cx = clamp(a[0] ?? 0, 0, s - 1);
        const cy = clamp(a[1] ?? 0, 0, s - 1);
        for (let y = cy - ry; y <= cy + ry; y++) {
          for (let x = cx - rx; x <= cx + rx; x++) {
            const nx = (x - cx) / rx;
            const ny = (y - cy) / ry;
            if (nx * nx + ny * ny <= 1) setPx(grid, x, y, s);
          }
        }
        break;
      }
      case 'mirror': {
        const axis = (parts[1] ?? 'H').toUpperCase();
        if (axis === 'H') {
          for (let y = 0; y < s; y++)
            for (let x = 0; x < Math.floor(s / 2); x++) if (grid[y]![x]) grid[y]![s - 1 - x] = true;
        } else {
          for (let y = 0; y < Math.floor(s / 2); y++)
            for (let x = 0; x < s; x++) if (grid[y]![x]) grid[s - 1 - y]![x] = true;
        }
        break;
      }
      default:
        break;
    }
  }
}

// ---------- Per-frame post-process (same constants as the prototype) ----------

function postProcessFrame(frame: boolean[][], s: number): boolean[][] {
  const largest = keepLargestComponent(frame, s);
  const ratio = countPixels(largest) / (s * s);
  if (ratio > MAX_FILL_RATIO) return thinOut(largest, s);
  if (ratio < MIN_FILL_RATIO) return dilateOnce(largest, s);
  return largest;
}

function countPixels(frame: boolean[][]): number {
  let c = 0;
  for (const row of frame) for (const v of row) if (v) c++;
  return c;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function keepLargestComponent(frame: boolean[][], s: number): boolean[][] {
  const seen = Array.from({ length: s }, () => Array.from({ length: s }, () => false));
  let best: Array<[number, number]> = [];
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (!frame[y]![x] || seen[y]![x]) continue;
      const queue: Array<[number, number]> = [[x, y]];
      seen[y]![x] = true;
      const comp: Array<[number, number]> = [[x, y]];
      while (queue.length) {
        const [cx, cy] = queue.shift()!;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < s && ny < s && !seen[ny]![nx] && frame[ny]![nx]) {
            seen[ny]![nx] = true;
            queue.push([nx, ny]);
            comp.push([nx, ny]);
          }
        }
      }
      if (comp.length > best.length) best = comp;
    }
  }
  if (best.length === 0) return frame;
  const out = emptyGrid(s);
  for (const [x, y] of best) out[y]![x] = true;
  return out;
}

function thinOut(frame: boolean[][], s: number): boolean[][] {
  const out = frame.map((row) => row.slice());
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) if (out[y]![x] && (x % 2 !== 0 || y % 2 !== 0)) out[y]![x] = false;
  return out;
}

function dilateOnce(frame: boolean[][], s: number): boolean[][] {
  const out = frame.map((row) => row.slice());
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (!frame[y]![x]) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < s && ny < s) out[ny]![nx] = true;
      }
    }
  }
  return out;
}
