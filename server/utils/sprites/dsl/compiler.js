// Minimal SpriteDSL compiler (no external deps)
// Input: { gridSize, frames: [{ ops: ["rect 3 6 6 1", ...] }] }
// Output: { gridSize, frames: boolean[][][] }

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function compileSpriteDSL(dsl) {
  const parsed = normalizeDSL(dsl);
  const s = parsed.gridSize;
  const frames = Array.from({ length: parsed.frames.length }, () =>
    Array.from({ length: s }, () => Array.from({ length: s }, () => false))
  );

  parsed.frames.forEach((frame, fi) => {
    for (const raw of frame.ops) {
      const [op, ...args] = String(raw).trim().split(/\s+/);
      switch ((op||'').toLowerCase()) {
        case 'rect': {
          let [x, y, w, h] = args.map(v => parseInt(v, 10) || 0);
          x = clamp(x,0,s-1); y = clamp(y,0,s-1); w = clamp(w,0,s); h = clamp(h,0,s);
          for (let yy=0; yy<h; yy++) for (let xx=0; xx<w; xx++) set(frames, fi, x+xx, y+yy, true);
          break; }
        case 'pixel': {
          let [x, y] = args.map(v => parseInt(v, 10) || 0);
          x = clamp(x,0,s-1); y = clamp(y,0,s-1); set(frames, fi, x, y, true); break; }
        case 'line': {
          let [x0,y0,x1,y1] = args.map(v => parseInt(v,10) || 0);
          x0=clamp(x0,0,s-1); y0=clamp(y0,0,s-1); x1=clamp(x1,0,s-1); y1=clamp(y1,0,s-1);
          const dx=Math.abs(x1-x0), sx=x0<x1?1:-1; const dy=-Math.abs(y1-y0), sy=y0<y1?1:-1; let err=dx+dy;
          while(true){ set(frames, fi, x0, y0, true); if(x0===x1&&y0===y1) break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} }
          break; }
        case 'oval': {
          let [cx,cy,rx,ry] = args.map(v => parseInt(v,10) || 0);
          rx = clamp(rx,1,s); ry = clamp(ry||rx,1,s); cx = clamp(cx,0,s-1); cy = clamp(cy,0,s-1);
          for(let y=cy-ry;y<=cy+ry;y++) for(let x=cx-rx;x<=cx+rx;x++){
            const nx=(x-cx)/rx, ny=(y-cy)/ry; if(nx*nx+ny*ny<=1) set(frames, fi, x, y, true);
          }
          break; }
        case 'mirror': {
          const axis=(args[0]||'H').toUpperCase();
          if(axis==='H'){
            for(let y=0;y<s;y++) for(let x=0;x<Math.floor(s/2);x++) if(frames[fi][y][x]) frames[fi][y][s-1-x]=true;
          } else {
            for(let y=0;y<Math.floor(s/2);y++) for(let x=0;x<s;x++) if(frames[fi][y][x]) frames[fi][s-1-y][x]=true;
          }
          break; }
        default: break;
      }
    }
  });
  return { gridSize: s, frames };
}

function set(frames, fi, x, y, val){ const s=frames[fi].length; if(x>=0&&y>=0&&x<s&&y<s) frames[fi][y][x]=!!val; }

function normalizeDSL(dsl){
  const out = { gridSize: 12, frames: [] };
  const g = Number(dsl?.gridSize ?? 12); out.gridSize = isFinite(g)? clamp(Math.round(g),8,32):12;
  const frames = Array.isArray(dsl?.frames)? dsl.frames:[]; const limited = frames.slice(0,3);
  out.frames = (limited.length?limited:[{ops:['pixel 6 6']}]).map(fr=>({ ops: Array.isArray(fr?.ops)? fr.ops.filter(s=>typeof s==='string'):['pixel 6 6'] }));
  return out;
}

export default { compileSpriteDSL };

