const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const gamesSel = document.getElementById('games');
const loadBtn = document.getElementById('load-pack');
const nameInp = document.getElementById('name');
const entitiesList = document.getElementById('entities');
const gridInp = document.getElementById('grid');
const colorInp = document.getElementById('color');
const scaleInp = document.getElementById('scale');
const playChk = document.getElementById('play');
const fpsInp = document.getElementById('fps');
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
  play(mask, color, scale);
}

function play(mask, color, scale) {
  const frames = mask.frames.length;
  let fi = 0;
  const drawOnce = () => {
    clear();
    drawSprite(mask, color, 32, 32, scale, fi % frames);
    ascii.textContent = toAscii(mask, fi % frames);
  };
  drawOnce();
  if (!playChk.checked || frames <= 1) return;
  const fps = Math.max(1, Math.min(24, Number(fpsInp.value)||6));
  const iv = setInterval(() => { if (!playChk.checked) return clearInterval(iv); fi++; drawOnce(); }, 1000 / fps);
}

btn.addEventListener('click', generate);
nameInp.addEventListener('keydown', (e)=>{ if (e.key==='Enter') generate(); });
window.addEventListener('load', ()=>{ nameInp.focus(); });

// Load games and allow pack preview
async function loadGames() {
  try {
    const r = await fetch('/games');
    const games = await r.json();
    gamesSel.innerHTML = '';
    for (const g of games) {
      const opt = document.createElement('option');
      opt.value = g.id; opt.textContent = `${g.name || 'Game'} (${g.id.slice(0,8)})`;
      gamesSel.appendChild(opt);
    }
  } catch {}
}

async function loadPack() {
  const id = gamesSel.value;
  if (!id) return;
  try {
    const r = await fetch(`/games/${id}/sprites.json`);
    if (!r.ok) { ascii.textContent = `No sprites.json for ${id}`; return; }
    const pack = await r.json();
    const items = Object.keys(pack.items || {});
    entitiesList.innerHTML = '';
    items.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; entitiesList.appendChild(opt);
    });
    if (items.length) { nameInp.value = items[0]; }
    ascii.textContent = `Loaded ${items.length} sprites from ${id}`;
    // Draw first one
    const color = colorInp.value || '#ffd34e';
    const scale = Math.max(1, Math.min(12, Number(scaleInp.value)||4));
    const mask = pack.items[ nameInp.value ];
    if (mask) play(mask, color, scale);
  } catch (e) {
    ascii.textContent = 'Error loading pack: ' + (e?.message||'failed');
  }
}

loadBtn.addEventListener('click', loadPack);
window.addEventListener('load', loadGames);
