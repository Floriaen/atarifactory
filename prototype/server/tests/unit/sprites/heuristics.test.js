import { describe, it, expect } from 'vitest';
import { compileSpriteDSL } from '../../../utils/sprites/dsl/compiler.js';

describe('compiler heuristics', () => {
  it('thins overly dense masks', () => {
    const dsl = { gridSize: 12, frames: [ { ops: ['rect 0 0 12 12'] } ], meta: { entity: 'block' } };
    const mask = compileSpriteDSL(dsl);
    const total = 12*12;
    const count = mask.frames[0].reduce((a,r)=>a+r.filter(Boolean).length,0);
    expect(count/total).toBeLessThanOrEqual(0.40);
  });

  it('expands too sparse masks', () => {
    const dsl = { gridSize: 12, frames: [ { ops: ['pixel 6 6'] } ], meta: { entity: 'dot' } };
    const mask = compileSpriteDSL(dsl);
    const count = mask.frames[0].reduce((a,r)=>a+r.filter(Boolean).length,0);
    expect(count).toBeGreaterThan(1);
  });

  it('keeps only largest connected component', () => {
    const dsl = { gridSize: 12, frames: [ { ops: ['pixel 1 1','pixel 10 10','pixel 2 1'] } ], meta: { entity: 'two-dots' } };
    const mask = compileSpriteDSL(dsl);
    // count components (simple)
    const s = 12; const seen = Array.from({length:s},()=>Array.from({length:s},()=>false));
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    let comps=0;
    for(let y=0;y<s;y++) for(let x=0;x<s;x++){
      if (!mask.frames[0][y][x]||seen[y][x]) continue;
      comps++;
      const q=[[x,y]]; seen[y][x]=true;
      while(q.length){ const [cx,cy]=q.shift(); for(const [dx,dy] of dirs){ const nx=cx+dx, ny=cy+dy; if(nx>=0&&ny>=0&&nx<s&&ny<s&&!seen[ny][nx]&&mask.frames[0][ny][nx]){ seen[ny][nx]=true; q.push([nx,ny]); } } }
    }
    expect(comps).toBe(1);
  });
});

