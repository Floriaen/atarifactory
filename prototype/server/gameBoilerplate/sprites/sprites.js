(function(){
  // Simple sprite pack + helpers exposed on window for generated code
  window.spritePack = window.spritePack || { items: {} };

  // Simple local normalizer (kept separate from pipeline)
  window.normalizeSpriteKey = function(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  };

  window.getSprite = function(name) {
    if (!name || !window.spritePack || !window.spritePack.items) return null;
    const key = window.normalizeSpriteKey(name);
    return window.spritePack.items[key] || null;
  };

  window.drawSpriteMono = function(ctx, mask, color, x, y, scale, frameIndex){
    if (!mask || !ctx) return;
    const s = mask.gridSize || 12;
    const fi = Math.max(0, Math.min((mask.frames?.length||1)-1, frameIndex||0));
    ctx.save();
    ctx.fillStyle = color || '#ffd34e';
    for (let yy = 0; yy < s; yy++) {
      for (let xx = 0; xx < s; xx++) {
        if (mask.frames[fi] && mask.frames[fi][yy] && mask.frames[fi][yy][xx]) {
          ctx.fillRect(Math.round(x + xx * scale), Math.round(y + yy * scale), scale, scale);
        }
      }
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle="#FFFFFF";
    ctx.strokeRect(x, y, s * scale, s * scale);

    ctx.restore();
  };

  window.renderEntity = function(ctx, name, x, y, scale, color, frame){
    const mask = window.getSprite(name);
    if (mask) {
      window.drawSpriteMono(ctx, mask, color || '#ffd34e', x, y, scale || 4, (frame||0) % (mask.frames?.length||1));
    } else {
      ctx.fillStyle = color || '#ffd34e';
      ctx.fillRect(x, y, Math.max(1, scale||4), Math.max(1, scale||4));
    }
  };

  // Try to load sprites.json generated during build; ignore errors if missing
  try {
    fetch('sprites.json').then(function(r){ if(!r.ok) return null; return r.json(); }).then(function(j){
      if (j && j.items) { window.spritePack = j; }
    }).catch(function(){ /* no-op */ });
  } catch(e) { /* no-op */ }
})();

