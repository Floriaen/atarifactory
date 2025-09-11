const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const nameInp = document.getElementById('name');
const gridInp = document.getElementById('grid');
const colorInp = document.getElementById('color');
const scaleInp = document.getElementById('scale');
const btn = document.getElementById('generate');
const ascii = document.getElementById('ascii');

function clear() {
  ctx.fillStyle = '#0b120b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSprite(mask, color, x, y, scale, frameIndex=0) {
  const s = mask.gridSize;
  ctx.save();
  ctx.fillStyle = color || '#ffd34e';
  for (let yy = 0; yy < s; yy++) {
    for (let xx = 0; xx < s; xx++) {
      if (mask.frames[frameIndex]?.[yy]?.[xx]) {
        ctx.fillRect(Math.round(x + xx * scale), Math.round(y + yy * scale), scale, scale);
      }
    }
  }
  ctx.restore();
}

function toAscii(mask, frameIndex=0) {
  const s = mask.gridSize;
  const rows = [];
  for (let y=0;y<s;y++) {
    let line = '';
    for (let x=0;x<s;x++) line += mask.frames[frameIndex]?.[y]?.[x] ? '#':'·';
    rows.push(line);
  }
  return rows.join('\n');
}

async function generate() {
  const name = (nameInp.value || '').trim();
  const grid = Number(gridInp.value || 12) || 12;
  if (!name) { alert('Enter an entity name'); return; }
  clear();
  const resp = await fetch(`/debug/sprites/generate?name=${encodeURIComponent(name)}&grid=${grid}`);
  const data = await resp.json();
  if (!data.ok) {
    ascii.textContent = 'Error: ' + (data.error || 'failed');
    return;
  }
  const mask = data.mask;
  const scale = Math.max(1, Math.min(12, Number(scaleInp.value)||4));
  const color = colorInp.value || '#ffd34e';
  drawSprite(mask, color, 32, 32, scale, 0);
  if (mask.frames.length>1) drawSprite(mask, color, 32 + mask.gridSize*scale + 24, 32, scale, 1);
  ascii.textContent = toAscii(mask, 0);
}

btn.addEventListener('click', generate);
nameInp.addEventListener('keydown', (e)=>{ if (e.key==='Enter') generate(); });
window.addEventListener('load', ()=>{ nameInp.focus(); });

