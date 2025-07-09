// Fixture game for integration test: generated-game.js
// This is a minimal but realistic game file for testing control bar input transformation.

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 360;
canvas.height = 640;

let player = { x: 180, y: 600, width: 40, height: 40, color: 'blue' };
let moveLeft = false;
let moveRight = false;

// Keyboard input (should be removed by transformer)
window.addEventListener('keydown', function(e) {
  if (e.code === 'ArrowLeft') moveLeft = true;
  if (e.code === 'ArrowRight') moveRight = true;
});
window.addEventListener('keyup', function(e) {
  if (e.code === 'ArrowLeft') moveLeft = false;
  if (e.code === 'ArrowRight') moveRight = false;
});

function updatePlayer() {
  if (moveLeft) player.x -= 5;
  if (moveRight) player.x += 5;
  if (player.x < 0) player.x = 0;
  if (player.x > 320) player.x = 320;
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePlayer();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}
gameLoop();
