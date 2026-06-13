// Minimal sprite renderer for boolean mask frames
// Mask format: { gridSize: number, frames: boolean[][][] }

export function drawSprite(ctx, mask, color = '#000', x = 0, y = 0, scale = 1, frameIndex = 0) {
  if (!mask || !Array.isArray(mask.frames) || mask.frames.length === 0) return;
  const frame = mask.frames[Math.max(0, Math.min(frameIndex || 0, mask.frames.length - 1))];
  if (!Array.isArray(frame) || frame.length === 0) return;

  ctx.save && ctx.save();
  if (color) ctx.fillStyle = color;

  const s = Number(scale) || 1;
  for (let y0 = 0; y0 < frame.length; y0++) {
    const row = frame[y0];
    if (!Array.isArray(row)) continue;
    for (let x0 = 0; x0 < row.length; x0++) {
      if (row[x0]) {
        ctx.fillRect(x + x0 * s, y + y0 * s, s, s);
      }
    }
  }

  ctx.restore && ctx.restore();
}

// no default export
