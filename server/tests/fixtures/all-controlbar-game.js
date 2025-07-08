// Fixture game that uses all controlBar actions: left, right, up, down, btn1, btn2
// The game visually marks the last action received and moves a player block accordingly.

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 360;
canvas.height = 640;

window.player = { x: 180, y: 320, width: 40, height: 40, color: 'blue' };
window.lastAction = '';

function draw() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = window.player.color;
  ctx.fillRect(window.player.x, window.player.y, window.player.width, window.player.height);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Last action: ' + window.lastAction, canvas.width / 2, 40);
}

draw();

window.addEventListener('keydown', function(e) {
  switch (e.code) {
    case 'ArrowLeft': window.player.x -= 20; window.lastAction = 'left'; break;
    case 'ArrowRight': window.player.x += 20; window.lastAction = 'right'; break;
    case 'ArrowUp': window.player.y -= 20; window.lastAction = 'up'; break;
    case 'ArrowDown': window.player.y += 20; window.lastAction = 'down'; break;
    case 'Space': window.player.color = 'red'; window.lastAction = 'btn1'; break;
    case 'KeyX': window.player.color = 'green'; window.lastAction = 'btn2'; break;
  }
  draw();
});

window.addEventListener('keyup', function(e) {
  // Just for completeness, could reset color or do nothing
});
