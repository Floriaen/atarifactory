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

import * as dat from '../../node_modules/dat.gui/build/dat.gui.module.js';

// Generation settings with defaults
const settings = {
  // Pipeline control
  enableDebug: true,
  enableDevTrace: true,
  mockPipeline: false,
  minimalGame: false,

  // LLM settings
  model: 'gpt-4o-mini',

  // Logging
  logLevel: 'info',

  // Reset to defaults
  resetDefaults: function() {
    this.enableDebug = true;
    this.enableDevTrace = true;
    this.mockPipeline = false;
    this.minimalGame = false;
    this.model = 'gpt-4o-mini';
    this.logLevel = 'info';
    saveSettings();
    gui.updateDisplay();
  }
};

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem('gameGenerationSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(settings, parsed);
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
}

// Save settings to localStorage
function saveSettings() {
  try {
    const toSave = { ...settings };
    delete toSave.resetDefaults;
    localStorage.setItem('gameGenerationSettings', JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

// Initialize dat.GUI
loadSettings();
const gui = new dat.GUI({ width: 300 });
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '10px';
gui.domElement.style.zIndex = '10000';
gui.domElement.style.transform = 'scale(1.5)';
gui.domElement.style.transformOrigin = 'top right';

// Pipeline folder
const pipelineFolder = gui.addFolder('Pipeline');
pipelineFolder.add(settings, 'mockPipeline').name('Mock Pipeline').onChange(saveSettings);
pipelineFolder.add(settings, 'minimalGame').name('Minimal Game').onChange(saveSettings);
pipelineFolder.open();

// LLM folder
const llmFolder = gui.addFolder('LLM');
llmFolder.add(settings, 'model', ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).name('Model').onChange(saveSettings);
llmFolder.open();

// Debug folder
const debugFolder = gui.addFolder('Debug');
debugFolder.add(settings, 'enableDebug').name('Enable Debug').onChange(saveSettings);
debugFolder.add(settings, 'enableDevTrace').name('Enable Dev Trace').onChange(saveSettings);
debugFolder.add(settings, 'logLevel', ['debug', 'info', 'warn', 'error']).name('Log Level').onChange(saveSettings);
debugFolder.open();

// Reset button
gui.add(settings, 'resetDefaults').name('Reset to Defaults');

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
// Track current token count for animation
let currentTokenCount = 0;
let animationFrameId = null;

/**
 * Gets the appropriate animation duration based on the size of the increment.
 * @param {number} difference - The difference between start and end values.
 * @returns {number} Animation duration in milliseconds.
 */
function getAnimationDuration(difference) {
  if (difference < 5) return 300;
  if (difference < 25) return 600;
  if (difference < 100) return 1000;
  if (difference < 500) return 1200;
  return 1500;
}

/**
 * Animates the token count from one value to another with smooth easing.
 * @param {HTMLElement} element - The element containing the token count.
 * @param {number} startValue - Starting token count.
 * @param {number} endValue - Target token count.
 * @param {number} [duration] - Animation duration in ms (auto-calculated if not provided).
 */
function animateTokenCount(element, startValue, endValue, duration = null) {
  // Cancel any existing animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const difference = endValue - startValue;
  if (difference <= 0) {
    // No animation needed for decreases or no change
    setTokenCountDirect(endValue);
    return;
  }

  // Calculate duration if not provided
  if (!duration) {
    duration = getAnimationDuration(difference);
  }

  // Add updating class for CSS effects
  element.classList.add('updating');

  const startTime = performance.now();
  
  function updateCounter(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic function for smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    const currentValue = Math.floor(startValue + (difference * easedProgress));
    
    // Update the display
    const strongElement = element.querySelector('strong');
    if (strongElement) {
      strongElement.textContent = currentValue.toLocaleString();
    }
    
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(updateCounter);
    } else {
      // Animation complete
      element.classList.remove('updating');
      animationFrameId = null;
      // Ensure final value is exact
      if (strongElement) {
        strongElement.textContent = endValue.toLocaleString();
      }
      currentTokenCount = endValue;
    }
  }
  
  animationFrameId = requestAnimationFrame(updateCounter);
}

/**
 * Sets the token count directly without animation (for resets/decreases).
 * @param {number|string} count - Token count value.
 */
function setTokenCountDirect(count) {
  const numericCount = typeof count === 'string' ? parseInt(count) || 0 : count;
  DOM.tokenCountDiv.innerHTML = `<span>Tokens:</span> <strong>${numericCount.toLocaleString()}</strong>`;
  DOM.tokenCountDiv.style.visibility = 'visible';
  DOM.tokenCountDiv.style.opacity = '1';
  currentTokenCount = numericCount;
}

/**
 * Sets and shows the token count display with animation.
 * @param {number|string} count - Token count value.
 */
function setTokenCount(count) {
  const numericCount = typeof count === 'string' ? parseInt(count) || 0 : count;
  
  // Show the element if hidden
  DOM.tokenCountDiv.style.visibility = 'visible';
  DOM.tokenCountDiv.style.opacity = '1';
  
  // If this is the first time or count decreased, set directly
  if (currentTokenCount === 0 || numericCount <= currentTokenCount) {
    setTokenCountDirect(numericCount);
    return;
  }
  
  // Animate the increase
  animateTokenCount(DOM.tokenCountDiv, currentTokenCount, numericCount);
}
/** Hides the token count display. */
function hideTokenCount() {
  // Cancel any running animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  DOM.tokenCountDiv.style.visibility = 'hidden';
  DOM.tokenCountDiv.style.opacity = '0';
  DOM.tokenCountDiv.textContent = '';
  DOM.tokenCountDiv.classList.remove('updating');
  currentTokenCount = 0; // Reset for next session
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
  currentTokenCount = 0; // Ensure token count is reset
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
    const imageHtml = game.thumbnail
      ? `<img src="${API_BASE}${game.thumbnail}" alt="${game.name} thumbnail" loading="lazy" />`
      : `<div class="thumb-bg"></div>`;
    thumb.innerHTML = `
      ${imageHtml}
      <div class="thumb-label">
        <div class="thumb-title">${game.name}</div>
        <div class="thumb-date">${new Date(game.date).toLocaleDateString()}</div>
      </div>
    `;
    thumb.onclick = () => toggleGameDetails(thumb, game);
    gallery.appendChild(thumb);
  });
  // Ensure a single details banner exists right below the gallery
  ensureDetailsBanner();
  // Add light gray placeholders when fewer items
  const minThumbs = 5;
  const toAdd = Math.max(0, minThumbs - games.length);
  for (let i = 0; i < toAdd; i++) {
    const ph = document.createElement('div');
    ph.className = 'thumb placeholder';
    ph.innerHTML = `<div class="thumb-bg"></div>`;
    gallery.appendChild(ph);
  }
}

async function openGame(id) {
  const modal = DOM.modal;
  const frame = DOM.gameFrame;
  frame.src = `${API_BASE}/games/${id}`;
  modal.style.display = 'flex';
}

// Ensure a global details banner below the capsule grid
function ensureDetailsBanner() {
  const gallery = DOM.gallery;
  if (!document.getElementById('game-details-banner')) {
    const banner = document.createElement('div');
    banner.id = 'game-details-banner';
    banner.className = 'game-details-banner';
    banner.classList.add('empty');
    gallery.insertAdjacentElement('afterend', banner);
  }
}

// Toggle details banner below the gallery, spanning full app width
let currentOpenGameId = null;
async function toggleGameDetails(thumbEl, game) {
  ensureDetailsBanner();
  const banner = document.getElementById('game-details-banner');
  if (!banner) return;
  // Collapse if already showing this game's details
  if (currentOpenGameId === game.id) {
    banner.classList.add('empty');
    banner.innerHTML = '';
    currentOpenGameId = null;
    return;
  }
  // Show banner and load data
  currentOpenGameId = game.id;
  banner.classList.remove('empty');
  banner.innerHTML = `<div class="gd-row">Loading details…</div>`;

  try {
    const res = await fetch(`${API_BASE}/games/${game.id}/meta.json`);
    let meta = null;
    if (res.ok) meta = await res.json();
    const name = (meta && meta.name) || game.name || 'Game';
    const date = (meta && meta.date) || game.date;
    const desc = (meta && meta.description) || '';
    const model = (meta && meta.model) || 'unknown';
    const durationMs = (meta && meta.durationMs) || 0;
    const tokens = (meta && meta.tokens && meta.tokens.total) || 0;
    const usd = (meta && meta.cost && meta.cost.usd != null) ? Number(meta.cost.usd).toFixed(2) : '0.00';
    const secs = Math.max(0, Math.round(durationMs/100)/10);
    const humanDuration = formatDuration(secs);
    const humanDate = formatHumanDate(new Date(date));
    banner.innerHTML = `
      <div class="gd-header gd-header-row">
        <div class="gd-title-block">
          <div class="gd-title">${name}</div>
          <div class="gd-date">${humanDate}</div>
        </div>
        <div class="gd-actions-right"><button class="gd-play">Play</button></div>
      </div>
      ${desc ? `<div class="gd-desc">${desc}</div>` : ''}
      <div class="gd-build">Model: <strong>${model}</strong> · Time: <strong>${humanDuration}</strong> · Tokens: <strong>${Number(tokens).toLocaleString()}</strong> · Cost: <strong>$${usd}</strong></div>
    `;
    const playBtn = banner.querySelector('.gd-play');
    playBtn.onclick = (e) => { e.stopPropagation(); openGame(game.id); };
  } catch (e) {
    banner.innerHTML = `<div class="gd-row error">Failed to load details</div>`;
  }
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
        setStatusLabel(phase.description ? phase.description : phase.label);
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
  // Hide any open details on new generation
  const banner = document.getElementById('game-details-banner');
  if (banner) { banner.classList.add('empty'); banner.innerHTML = ''; }
  currentOpenGameId = null;
  const btn = this;
  setStatusLabel('Generating...');
  btn.disabled = true;
  let reader;
  try {
    // Prepare settings to send to server
    const generationSettings = {
      enableDebug: settings.enableDebug,
      enableDevTrace: settings.enableDevTrace,
      mockPipeline: settings.mockPipeline,
      minimalGame: settings.minimalGame,
      model: settings.model,
      logLevel: settings.logLevel
    };

    const response = await fetch(`${API_BASE}/generate-stream`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings: generationSettings })
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

// Human-friendly date like "Friday the 12th of September at 2:43PM"
function formatHumanDate(d) {
  try {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dow = days[d.getDay()];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const ordinal = (n) => {
      const s = ["th","st","nd","rd"], v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    };
    let hrs = d.getHours();
    const mins = d.getMinutes().toString().padStart(2,'0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12; if (hrs === 0) hrs = 12;
    return `${dow} the ${ordinal(day)} of ${month} at ${hrs}:${mins}${ampm}`;
  } catch {
    return d.toLocaleString();
  }
}

// Human-friendly duration: seconds -> "Xm Ys" when >= 60s, otherwise "Xs" (with 0.1s precision for small values)
function formatDuration(totalSeconds) {
  try {
    const s = Number(totalSeconds || 0);
    if (s < 60) {
      // show one decimal when under 10 seconds
      if (s < 10) return `${s.toFixed(1)}s`;
      return `${Math.round(s)}s`;
    }
    const minutes = Math.floor(s / 60);
    const seconds = Math.round(s % 60);
    return `${minutes}m ${seconds}s`;
  } catch {
    return `${Math.round(totalSeconds || 0)}s`;
  }
}
