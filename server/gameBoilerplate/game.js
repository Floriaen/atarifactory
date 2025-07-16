// Canonical initial JS for all generated games (pipeline-v3)
// Assumes #game-canvas and all DOM boilerplate are present (see game.html)

// Set up the canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Initialize game after canvas is properly sized
function initGame() {
  // TODO: Initialize game objects here using canvas.width and canvas.height
  // This runs after canvas dimensions are set by resizeGameArea()
  
  // Start the game loop
  gameLoop();
}

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // TODO: Add game logic here
  requestAnimationFrame(gameLoop);
}

// Wait for DOM and canvas to be properly sized before initializing
window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure resizeGameArea() has run
  setTimeout(initGame, 10);
});
