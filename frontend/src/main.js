/**
 * main.js - Frontend UI logic for Game Agent
 *
 * Responsibilities:
 * - Handles all DOM updates and event listeners for the main UI
 * - Manages gallery rendering, modal/game loading, and gamepad controls
 * - Connects to the backend pipeline via /generate-stream and updates UI in real time
 * - Provides progress bar, token count, and status/log feedback
 * - Centralizes all static DOM queries and UI update logic for maintainability
 * - Ensures robust error handling and user feedback throughout
 */

// Centralized DOM queries for static elements
const DOM = {
  header: document.querySelector('.header'),
  btnText: document.getElementById('btn-text'),
  statusLabel: document.getElementById('status-label'),
  tokenCountDiv: document.getElementById('token-count'),
  progressBarContainer: document.getElementById('progress-bar-container'),
  progressBar: document.getElementById('progress-bar'),
  progressBarLabel: document.getElementById('progress-bar-label'),
  gallery: document.getElementById('gallery'),
  modal: document.getElementById('modal'),
  gameFrame: document.getElementById('game-frame'),
  closeModal: document.getElementById('close-modal'),
  generateBtn: document.getElementById('generate-btn'),
};

const API_BASE = 'http://localhost:3001';

/**
 * Sets the status label text and makes it visible.
 * @param {string} text - Status message to display.
 */
function setStatusLabel(text) {
  DOM.statusLabel.style.display = '';
  DOM.statusLabel.textContent = text;
}

/** Shows the progress bar container. */
function showProgressBar() {
  DOM.progressBarContainer.style.visibility = 'visible';
  DOM.progressBarContainer.style.opacity = '1';
}
/** Hides and resets the progress bar. */
function hideProgressBar() {
  DOM.progressBarContainer.style.visibility = 'hidden';
  DOM.progressBarContainer.style.opacity = '0';
  DOM.progressBar.style.width = '0%';
  DOM.progressBarLabel.textContent = '';
}
/**
 * Updates the progress bar width and label based on progress (0..1).
 * @param {number} progress - Progress value between 0 and 1.
 */
function updateProgressBar(progress) {
  const pct = Math.max(0, Math.min(100, Math.round(100 * progress)));
  DOM.progressBar.style.width = pct + '%';
  DOM.progressBarLabel.textContent = pct + '%';
  showProgressBar();
}
/**
 * Sets and shows the token count display.
 * @param {number|string} count - Token count value.
 */
function setTokenCount(count) {
  DOM.tokenCountDiv.innerHTML = `<span>Tokens:</span> <strong>${count}</strong>`;
  DOM.tokenCountDiv.style.visibility = 'visible';
  DOM.tokenCountDiv.style.opacity = '1';
}
/** Hides the token count display. */
function hideTokenCount() {
  DOM.tokenCountDiv.style.visibility = 'hidden';
  DOM.tokenCountDiv.style.opacity = '0';
  DOM.tokenCountDiv.textContent = '';
}
/**
 * Resets UI to ready state (button, status, progress, token count).
 */
function setReady() {
  DOM.btnText.textContent = 'Generate Game';
  DOM.statusLabel.style.display = 'none';
  DOM.statusLabel.textContent = '';
  hideTokenCount();
  hideProgressBar();
}
setReady();

// Add a log area to the DOM
// Dynamically creates and manages the log area for status/error messages
const logArea = document.createElement('div');
logArea.id = 'log-area';
logArea.className = 'log-area';
logArea.style.opacity = 0;
document.querySelector('.header').appendChild(logArea);

/**
 * Shows a log message in the log area.
 * @param {string} msg - The message to display.
 * @param {string} [type] - Optional type (e.g., 'error').
 */
function setLog(msg, type = '') {
  const log = document.getElementById('log-area');
  log.textContent = msg;
  log.className = 'log-area' + (type ? ' ' + type : '');
  log.style.opacity = 1; // log-area is dynamically created, so keep this query
}

/**
 * Clears the log area after a delay.
 * @param {number} [delay=2000] - Time in ms before clearing.
 */
function clearLog(delay = 2000) {
  setTimeout(() => {
    const log = document.getElementById('log-area');
    log.style.opacity = 0;
    setTimeout(() => { log.textContent = ''; }, 300); // log-area is dynamically created, so keep this query
  }, delay);
}

/**
 * Fetches the list of games from the backend API.
 * Shows user-friendly errors on failure.
 * @returns {Promise<Array>} List of games.
 * @throws Error if fetch fails or response is not ok.
 */
async function fetchGames() {
  let res;
  try {
    res = await fetch(`${API_BASE}/games`);
  } catch (err) {
    setLog('Network error: Could not fetch games.', 'error');
    throw err;
  }
  if (!res.ok) {
    setLog(`Error: Failed to fetch games (${res.status} ${res.statusText})`, 'error');
    throw new Error(`Failed to fetch games: ${res.status} ${res.statusText}`);
  }
  let games = await res.json();
  return games;
}


function renderGallery(games) {
  const gallery = DOM.gallery;
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
  const modal = DOM.modal;
  const frame = DOM.gameFrame;
  frame.src = `${API_BASE}/games/${id}`;
  modal.style.display = 'flex';
}

DOM.closeModal.onclick = function () {
  DOM.modal.style.display = 'none';
  DOM.gameFrame.src = '';
};

// Restore SSE support for /generate-stream
// Use fetch to /generate-stream, read the stream, and update status/logs for each step
// On 'Done', update gallery and open game
// On 'Error', show error
// Fallback to /generate if needed

/**
 * Handles a single pipeline event chunk from the backend.
 * Updates UI based on event step/type.
 * @param {object} data - The parsed event data.
 * @param {HTMLButtonElement} btn - The generate button (for enabling/disabling).
 * @returns {Promise<boolean>} Returns true if the pipeline should stop (Done/Error), else false.
 */
async function handlePipelineEvent(data, btn) {
  if (data.step === 'Error') {
    handlePipelineError(data, btn);
    return true;
  }
  if (data.step === 'Done') {
    await handlePipelineDone(data, btn);
    return true;
  }
  if (data.step === 'TokenCount' && typeof data.tokenCount === 'number') {
    setTokenCount(data.tokenCount);
    return false; // Don't update status label for TokenCount events
  }
  if (data.type === 'PipelineStatus') {
    if (typeof data.progress === 'number') {
      updateProgressBar(data.progress);
    } else {
      hideProgressBar();
    }
    if (typeof data.tokenCount === 'number') {
      setTokenCount(data.tokenCount);
    }
    // Use phase.label for PipelineStatus events
    if (data.phase) {
      // Parse phase if it's a JSON string
      const phase = typeof data.phase === 'string' ? JSON.parse(data.phase) : data.phase;
      if (phase && phase.label) {
        setStatusLabel(phase.label + (phase.description ? ': ' + phase.description : ''));
      }
    }
  } else {
    // Use step for other event types (excluding TokenCount which returns early)
    setStatusLabel(data.step + (data.description ? ': ' + data.description : '...'));
  }
  return false;
}

/**
 * Handles pipeline error event: shows log, resets UI, enables button.
 * @param {object} data - Error event data.
 * @param {HTMLButtonElement} btn - The generate button.
 */
function handlePipelineError(data, btn) {
  setLog('Error: ' + (data.error || 'Unknown error'), 'error');
  setReady();
  btn.disabled = false;
  clearLog(4000);
}

/**
 * Handles pipeline done event: updates gallery, opens game, resets UI, enables button.
 * @param {object} data - Done event data.
 * @param {HTMLButtonElement} btn - The generate button.
 */
async function handlePipelineDone(data, btn) {
  setStatusLabel('Done!');
  hideTokenCount();
  hideProgressBar();
  // Update gallery and open game
  const games = await fetchGames();
  renderGallery(games);
  if (data.game && data.game.id) {
    openGame(data.game.id);
  }
  setTimeout(() => setReady(), 1200);
  btn.disabled = false;
}

DOM.generateBtn.onclick = async function () {
  showProgressBar();
  updateProgressBar(0);
  setTokenCount('');
  const btn = this;
  setStatusLabel('Generating...');
  btn.disabled = true;
  let reader;
  try {
    const response = await fetch(`${API_BASE}/generate-stream`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    if (!response.body) throw new Error('No response body');
    reader = response.body.getReader();
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
            const shouldStop = await handlePipelineEvent(data, btn);
            if (shouldStop) return;
          }
        }
      }
    }
  } catch (err) {
    setLog('Error: ' + err.message, 'error');
    setReady();
    btn.disabled = false;
    clearLog(4000);
  } finally {
    if (reader) reader.cancel();
  }
};

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const games = await fetchGames();
    renderGallery(games);
    setReady(); // No DOM queries here, just function calls
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