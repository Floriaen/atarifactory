import './style.css';

const API_BASE = 'http://localhost:3001';

const app = document.getElementById('app');

app.innerHTML = `
  <div class="header">
    <h1>Atari-like Game Factory</h1>
    <button id="generate-btn">
      <span id="btn-text">Generate Game</span>
      <span id="spinner" style="display:none;">⏳</span>
    </button>
  </div>
  <div class="gallery-container">
    <div id="gallery" class="gallery"></div>
  </div>
  <div id="modal" class="modal" style="display:none;">
    <div class="modal-content">
      <span id="close-modal" class="close">&times;</span>
      <iframe id="game-frame" src="" frameborder="0" allowfullscreen></iframe>
    </div>
  </div>
`;

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; font-family: system-ui, sans-serif; background: #181818; color: #fff; }
  .header { display: flex; flex-direction: column; align-items: center; padding: 1rem 0 0.5rem 0; }
  .header h1 { font-size: 1.5rem; margin: 0 0 0.5rem 0; }
  #generate-btn { font-size: 1.1rem; padding: 0.7em 1.5em; border-radius: 1.5em; border: none; background: #ffb300; color: #222; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px #0004; display: flex; align-items: center; gap: 0.5em; }
  #generate-btn:active { background: #ffa000; }
  #spinner { font-size: 1.2em; }
  .log-area { min-height: 1.5em; margin-top: 0.5em; font-size: 0.95em; color: #ffb300; background: #222; border-radius: 0.5em; padding: 0.3em 1em; max-width: 90vw; text-align: center; transition: opacity 0.3s; }
  .log-area.error { color: #ff4444; background: #2a1818; }
  .gallery-container { overflow-x: auto; padding: 1rem 0.5rem; }
  .gallery { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
  .thumb { flex: 0 0 auto; width: 96px; height: 120px; border-radius: 0.7em; background: #333; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-shadow: 0 2px 8px #0006; cursor: pointer; border: 2px solid transparent; transition: border 0.2s; margin-bottom: 0.5rem; overflow: hidden; }
  .thumb.selected, .thumb:active { border: 2px solid #ffb300; }
  .thumb img { width: 80px; height: 80px; object-fit: cover; border-radius: 0.5em; background: #333; display: block; margin: 0 auto; }
  .thumb-label { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 0.2em; color: #ccc; width: 100%; }
  .thumb-title { font-size: 0.85em; font-weight: 600; color: #fff; text-align: center; margin-bottom: 0.1em; word-break: break-word; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .thumb-date { font-size: 0.7em; color: #ffb300; text-align: center; }
  .modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000a; display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .modal-content { background: #222; border-radius: 1em; padding: 0.5em; box-shadow: 0 4px 32px #000c; position: relative; width: 95vw; max-width: 480px; height: 80vh; display: flex; flex-direction: column; }
  #game-frame { flex: 1; width: 100%; border-radius: 0.7em; background: #111; }
  .close { position: absolute; top: 0.3em; right: 0.7em; font-size: 2em; color: #ffb300; cursor: pointer; z-index: 10; }
  @media (max-width: 600px) {
    .modal-content { max-width: 99vw; height: 80vh; }
    .gallery { gap: 0.5rem; }
    .thumb { width: 72px; height: 96px; }
    .thumb img { width: 60px; height: 60px; }
    .thumb-title { max-width: 60px; }
  }
  .thumb-bg { width: 80px; height: 80px; background: #333; border-radius: 0.5em; margin: 0 auto; margin-top: 8px; margin-bottom: 4px; }
`;
document.head.appendChild(style);

const STEPS = ['Generating', 'Testing', 'Fixing', 'Done'];
function setStep(idx) {
  const btnText = document.getElementById('btn-text');
  btnText.textContent = STEPS[idx] + '...';
}
function setReady() {
  const btnText = document.getElementById('btn-text');
  btnText.textContent = 'Generate Game';
}
setReady();

function setLog(msg, type = '') {
  const log = document.getElementById('log-area');
  log.textContent = msg;
  log.className = 'log-area' + (type ? ' ' + type : '');
  log.style.opacity = 1;
}

function clearLog(delay = 2000) {
  setTimeout(() => {
    const log = document.getElementById('log-area');
    log.style.opacity = 0;
    setTimeout(() => { log.textContent = ''; }, 300);
  }, delay);
}

async function fetchGames() {
  const res = await fetch(`${API_BASE}/games`);
  return res.json();
}

function renderGallery(games) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  games.forEach(game => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.title = game.name;
    thumb.innerHTML = `
      <div class="thumb-bg"></div>
      <div class="thumb-label">
        <div class="thumb-title">${game.name}</div>
        <div class="thumb-date">${new Date(game.date).toLocaleDateString()}</div>
      </div>
    `;
    thumb.onclick = () => openGame(game.id);
    gallery.appendChild(thumb);
  });
}

async function openGame(id) {
  const modal = document.getElementById('modal');
  const frame = document.getElementById('game-frame');
  frame.src = `${API_BASE}/games/${id}`;
  modal.style.display = 'flex';
}

document.getElementById('close-modal').onclick = function() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('game-frame').src = '';
};

document.getElementById('generate-btn').onclick = async function() {
  const btn = this;
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('spinner');
  btn.disabled = true;
  spinner.style.display = '';
  setStep(0);
  try {
    setStep(0);
    await new Promise(r => setTimeout(r, 400));
    setStep(1);
    await new Promise(r => setTimeout(r, 400));
    setStep(2);
    await new Promise(r => setTimeout(r, 400));
    const res = await fetch(`${API_BASE}/generate`, { method: 'POST' });
    if (!res.ok) throw new Error('Server error');
    setStep(3);
    const data = await res.json();
    const games = await fetchGames();
    renderGallery(games);
    if (data && data.game && data.game.id) {
      openGame(data.game.id);
    }
    setTimeout(() => setReady(), 1200);
  } catch (err) {
    alert('Error: ' + err.message);
    setReady();
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const games = await fetchGames();
    renderGallery(games);
    setReady();
  } catch (err) {
    alert('Error loading games: ' + err.message);
    setReady();
  }
});
// For Vite hot reload
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
