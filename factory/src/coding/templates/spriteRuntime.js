'use strict';
// Deterministic sprite runtime. Reads the inlined `window.spritePack` (id -> {gridSize, frames})
// and exposes the three globals `game.js` draws through. No LLM, no network.

function getSprite(id) {
  return (window.spritePack && window.spritePack[id]) || null;
}

// Draw a boolean pixel mask as solid `scale`x`scale` blocks in one colour (mono).
function drawSpriteMono(ctx, mask, x, y, scale, color) {
  if (!mask) return;
  var s = scale > 0 ? scale : 1;
  ctx.fillStyle = color || '#ffffff';
  for (var gy = 0; gy < mask.length; gy++) {
    var row = mask[gy];
    for (var gx = 0; gx < row.length; gx++) {
      if (row[gx]) ctx.fillRect((x + gx * s) | 0, (y + gy * s) | 0, s, s);
    }
  }
}

// Render one entity's sprite. `frame` selects an animation frame and wraps automatically.
function renderEntity(ctx, id, x, y, scale, color, frame) {
  var sprite = getSprite(id);
  if (!sprite || !sprite.frames || !sprite.frames.length) return;
  var n = sprite.frames.length;
  var idx = (frame | 0) % n;
  if (idx < 0) idx += n;
  drawSpriteMono(ctx, sprite.frames[idx], x, y, scale, color);
}
