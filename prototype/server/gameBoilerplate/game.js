// Canonical initial JS for all generated games (pipeline-v3)
// Assumes #game-canvas and all DOM boilerplate are present (see game.html)

// Set up the canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Background handle and timing
let __bg = null;
let __last = performance.now();

// Initialize game after canvas is properly sized
function initGame() {
  // Initialize background (must be provided by per-game background.js)
  // Intentionally no try/catch and no fallback — crash if missing to surface setup issues
  __bg = window.Background.createBackground(ctx, canvas);
  // TODO: Initialize game objects here using canvas.width and canvas.height
  // This runs after canvas dimensions are set by resizeGameArea()
  
  // Start the game loop
  gameLoop();
}

// Main game loop
function gameLoop() {
  const now = performance.now();
  const dt = Math.max(0, (now - __last) / 1000);
  __last = now;
  // Boilerplate handles clearing so generated code shouldn't repaint the full canvas.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw background first
  __bg.update(dt);
  __bg.draw(ctx);

  // TODO: Add game logic here (entities, collisions, UI)

  requestAnimationFrame(gameLoop);
}

// Wait for DOM and canvas to be properly sized before initializing
window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure resizeGameArea() has run
  setTimeout(initGame, 10);
});
