// Simple fixture game: Bouncing square
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;

let x = 100, y = 100;
let vx = 2, vy = 3;
const size = 40;

function update() {
  x += vx;
  y += vy;
  if (x < 0 || x + size > canvas.width) vx *= -1;
  if (y < 0 || y + size > canvas.height) vy *= -1;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(x, y, size, size);
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
