'use strict';
// Backdrop. game.js calls this at the start of each frame instead of clearing the canvas itself
// (the Atari "no full-canvas clear" rule is enforced on game.js, not the runtime). Pass an optional
// CSS colour to paint any backdrop — so a game never needs its own full-canvas fill.

function drawBackground(ctx, color) {
  var canvas = ctx.canvas;
  ctx.fillStyle = color || '#0a0a14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
