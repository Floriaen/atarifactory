/** Draw a sprite's frames side by side onto a canvas (boolean masks → pixels). */
export function drawSprite(
  canvas: HTMLCanvasElement,
  frames: boolean[][][],
  gridSize: number,
  scale = 14,
): void {
  const gut = scale; // gutter between frames
  const cell = gridSize * scale;
  const w = frames.length * cell + (frames.length + 1) * gut;
  const h = cell + 2 * gut;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(0, 0, w, h);

  frames.forEach((frame, fi) => {
    const ox = gut + fi * (cell + gut);
    const oy = gut;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(ox, oy, cell, cell);
    ctx.fillStyle = '#14141c';
    for (let y = 0; y < gridSize; y++) {
      const row = frame[y] ?? [];
      for (let x = 0; x < gridSize; x++) {
        if (row[x]) ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
  });
}
