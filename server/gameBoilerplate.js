// Canonical initial JS for all generated games (pipeline-v3)
// Assumes #game-canvas and all DOM boilerplate are present (see gameBoilerplate.html)

// Set up the canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // TODO: Add game logic here
  requestAnimationFrame(gameLoop);
}
gameLoop();
