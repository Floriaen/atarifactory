export const mockBackgroundCodeResponse = {
  fileName: 'background.js',
  code: `(() => {
  window.Background = window.Background || {};
  window.Background.createBackground = (ctx, canvas) => ({
    update() {},
    draw(drawCtx) {
      drawCtx.fillStyle = '#000';
      drawCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });
})();`,
  notes: 'Mock background code for unit tests'
};
