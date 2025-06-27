import './style.css';

const API_BASE = 'http://localhost:3001';

const app = document.getElementById('app');

app.innerHTML = `
  <div class="header">
    <h1>Atari-like Game Factory</h1>
    <button id="generate-btn">
      <span id="btn-text">Generate Game</span>
    </button>
    <div id="token-count" class="token-count" style="visibility:hidden; opacity:0;"></div>
    <div id="progress-bar-container" style="visibility:hidden; opacity:0; width: 240px; margin: 0.2em auto 0.6em auto;">
      <div id="progress-bar-bg" style="background: #232329; border-radius: 0.5em; width: 100%; height: 14px; box-shadow: 0 1px 4px #0006;">
        <div id="progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg,#ffb300,#ffd54f); border-radius: 0.5em; transition: width 0.25s;"></div>
      </div>
      <div id="progress-bar-label" style="text-align:center; color:#b0b0b8; font-size:0.97em; margin-top:2px; font-family:monospace;"></div>
    </div>
    <div id="status-label" class="status-label" style="display:none;"></div>
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
  .token-count {
    margin-top: 1.1em;
    margin-bottom: 0.3em;
    margin-left: 0;
    font-size: 1.02em;
    color: #b0b0b8;
    min-width: 100px;
    text-align: center;
    display: block;
    font-family: monospace;
    opacity: 0.92;
    letter-spacing: 0.02em;
    transition: opacity 0.2s;
  }
  .token-count strong {
    color: #b3e5fc;
    font-weight: 600;
    font-size: 1.08em;
  }

  body { margin: 0; font-family: system-ui, sans-serif; background: #181818; color: #fff; }
  .header { display: flex; flex-direction: column; align-items: center; padding: 1rem 0 0.5rem 0; }
  .header h1 { font-size: 1.5rem; margin: 0 0 0.5rem 0; }
  #generate-btn { font-size: 1.1rem; padding: 0.7em 1.5em; border-radius: 1.5em; border: none; background: #ffb300; color: #222; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px #0004; display: flex; align-items: center; gap: 0.5em; }
  #generate-btn:active { background: #ffa000; }
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
  .status-label { text-align: center; font-size: 1.02em; color: #ffb300; font-weight: 500; margin: 0.5em 0 0.2em 0; min-height: 1.2em; transition: opacity 0.2s; }
  .gamepad-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    background: #222e;
    border-radius: 1em 1em 0 0;
    padding: 0.5em 1.2em 0.7em 1.2em;
    z-index: 100;
    box-shadow: 0 -2px 12px #0008;
    user-select: none;
    touch-action: none;
    gap: 1.2em;
  }
  .dpad {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
  }
  .dpad-row {
    display: flex;
    flex-direction: row;
    gap: 0.2em;
  }
  .dpad-btn {
    width: 2.2em;
    height: 2.2em;
    font-size: 1.3em;
    background: #444;
    color: #ffb300;
    border: none;
    border-radius: 0.5em;
    margin: 0.1em;
    font-weight: bold;
    box-shadow: 0 1px 4px #0006;
    cursor: pointer;
    transition: background 0.15s;
  }
  .dpad-btn:active, .dpad-btn.active {
    background: #ffb300;
    color: #222;
  }
  .btns {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
    margin-bottom: 0.5em;
    align-items: flex-end;
  }
  .game-btn {
    width: 2.7em;
    height: 2.7em;
    font-size: 1.2em;
    background: #ffb300;
    color: #222;
    border: none;
    border-radius: 50%;
    font-weight: bold;
    box-shadow: 0 1px 4px #0006;
    cursor: pointer;
    margin: 0.1em;
    transition: background 0.15s;
  }
  .game-btn:active, .game-btn.active {
    background: #fff;
    color: #ffb300;
  }
`;
document.head.appendChild(style);

function setStatusLabel(text) {
  const statusLabel = document.getElementById('status-label');
  statusLabel.style.display = '';
  statusLabel.textContent = text;
}
function setReady() {
  const btnText = document.getElementById('btn-text');
  const statusLabel = document.getElementById('status-label');
  const tokenCountDiv = document.getElementById('token-count');
  btnText.textContent = 'Generate Game';
  statusLabel.style.display = 'none';
  statusLabel.textContent = '';
  if (tokenCountDiv) {
    tokenCountDiv.style.visibility = 'hidden';
    tokenCountDiv.style.opacity = '0';
    tokenCountDiv.textContent = '';
  }
}
setReady();

// Add a log area to the DOM
const logArea = document.createElement('div');
logArea.id = 'log-area';
logArea.className = 'log-area';
logArea.style.opacity = 0;
document.querySelector('.header').appendChild(logArea);

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
  let games = await res.json();
  return games;
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

document.getElementById('close-modal').onclick = function () {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('game-frame').src = '';
};

// Restore SSE support for /generate-stream
// Use fetch to /generate-stream, read the stream, and update status/logs for each step
// On 'Done', update gallery and open game
// On 'Error', show error
// Fallback to /generate if needed

document.getElementById('generate-btn').onclick = async function () {
  const tokenCountDiv = document.getElementById('token-count');
  const progressBarContainer = document.getElementById('progress-bar-container');
  const progressBar = document.getElementById('progress-bar');
  const progressBarLabel = document.getElementById('progress-bar-label');
  progressBarContainer.style.visibility = 'visible';
  progressBarContainer.style.opacity = '1';
  progressBar.style.width = '0%';
  progressBarLabel.textContent = '';
  tokenCountDiv.style.visibility = 'visible';
  tokenCountDiv.style.opacity = '1';
  tokenCountDiv.textContent = '';
  let progressState = null;
  const btn = this;
  setStatusLabel('Generating...');
  btn.disabled = true;
  try {
    const response = await fetch(`${API_BASE}/generate-stream`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    let buffer = '';
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        buffer += new TextDecoder().decode(value);
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (chunk.startsWith('data: ')) {
            const data = JSON.parse(chunk.slice(6));
            if (data.step === 'Error') {
              setLog('Error: ' + (data.error || 'Unknown error'), 'error');
              setReady();
              progressBarContainer.style.visibility = 'hidden';
              progressBarContainer.style.opacity = '0';
              progressBar.style.width = '0%';
              progressBarLabel.textContent = '';
              btn.disabled = false;
              clearLog(4000);
              return;
            }
            if (data.step === 'Done') {
              setStatusLabel('Done!');
              tokenCountDiv.style.visibility = 'hidden';
              tokenCountDiv.style.opacity = '0';
              progressBarContainer.style.visibility = 'hidden';
              progressBarContainer.style.opacity = '0';
              progressBar.style.width = '0%';
              progressBarLabel.textContent = '';
              // Update gallery and open game
              const games = await fetchGames();
              renderGallery(games);
              if (data.game && data.game.id) {
                openGame(data.game.id);
              }
              setTimeout(() => setReady(), 1200);
              btn.disabled = false;
              return;
            }
            if ((data.step === 'TokenCount' || data.step === 'PlanningStep') && typeof data.tokenCount === 'number') {
              tokenCountDiv.innerHTML = `<span>Tokens:</span> <strong>${data.tokenCount}</strong>`;
            }
            // Unified Progress Bar: Only use canonical PipelineStatus events
            if (data.type === 'PipelineStatus') {
              if (typeof data.progress === 'number') {
                const pct = Math.max(0, Math.min(100, Math.round(100 * data.progress)));
                progressBar.style.width = pct + '%';
                progressBarLabel.textContent = pct + '%';
                progressBarContainer.style.visibility = 'visible';
                progressBarContainer.style.opacity = '1';
              } else {
                // Defensive: hide bar if no valid progress
                progressBar.style.width = '0%';
                progressBarLabel.textContent = '';
                progressBarContainer.style.visibility = 'hidden';
                progressBarContainer.style.opacity = '0';
              }
              // Token count display from canonical event
              if (typeof data.tokenCount === 'number') {
                tokenCountDiv.innerHTML = `<span>Tokens:</span> <strong>${data.tokenCount}</strong>`;
                tokenCountDiv.style.visibility = 'visible';
                tokenCountDiv.style.opacity = '1';
              }
            }
            if (data.step === 'PlanningStep' && data.phase) {
              setStatusLabel(`Planning: ${data.phase}...`);
            }
            console.log(data);
            setStatusLabel(data.step + (data.description ? ': ' + data.description : '...'));
          }
        }
      }
    }
  } catch (err) {
    setLog('Error: ' + err.message, 'error');
    setReady();
    btn.disabled = false;
    clearLog(4000);
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const games = await fetchGames();
    renderGallery(games);
    setReady();
  } catch (err) {
    setLog('Error loading games: ' + err.message, 'error');
    setReady();
    clearLog(4000);
  }
});
// For Vite hot reload
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

// Gamepad event handling
function emitGamepadEvent(type, key) {
  const event = new CustomEvent(`gamepad-${type}`, { detail: { key } });
  window.dispatchEvent(event);
}
function handlePadPress(e) {
  e.preventDefault();
  const key = e.currentTarget.dataset.key;
  e.currentTarget.classList.add('active');
  emitGamepadEvent('press', key);
}
function handlePadRelease(e) {
  e.preventDefault();
  const key = e.currentTarget.dataset.key;
  e.currentTarget.classList.remove('active');
  emitGamepadEvent('release', key);
}
[...document.querySelectorAll('.dpad-btn, .game-btn')].forEach(btn => {
  btn.addEventListener('mousedown', handlePadPress);
  btn.addEventListener('touchstart', handlePadPress, { passive: false });
  btn.addEventListener('mouseup', handlePadRelease);
  btn.addEventListener('mouseleave', handlePadRelease);
  btn.addEventListener('touchend', handlePadRelease);
  btn.addEventListener('touchcancel', handlePadRelease);
});
