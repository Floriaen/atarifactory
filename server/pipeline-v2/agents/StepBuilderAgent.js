/**
 * StepBuilderAgent
 * Input: {
 *   currentCode: string,
 *   plan: Array<{ id: number, label: string }>,
 *   step: { id: number, label: string }
 * }
 * Output: string (code block for the step)
 *
 * Generates the code block for the current step.
 */
async function StepBuilderAgent({ currentCode, plan, step }, { logger, traceId }) {
  logger.info('StepBuilderAgent called', { traceId, step });
  try {
    const label = step.label.toLowerCase();
    if (label.includes('setup')) {
      return `// Setup canvas and game loop\nconst canvas = document.createElement('canvas');\ncanvas.width = 320;\ncanvas.height = 240;\ndocument.body.appendChild(canvas);\nconst ctx = canvas.getContext('2d');\nfunction gameLoop() {\n  requestAnimationFrame(gameLoop);\n}\ngameLoop();`;
    }
    if (label.includes('player')) {
      return `// Add player and movement controls\nconst player = { x: 50, y: 200, w: 16, h: 16, vx: 0, vy: 0 };\ndocument.addEventListener('keydown', e => {\n  if (e.key === 'ArrowLeft') player.vx = -2;\n  if (e.key === 'ArrowRight') player.vx = 2;\n});\ndocument.addEventListener('keyup', e => {\n  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.vx = 0;\n});`;
    }
    if (label.includes('jump')) {
      return `// Add jumping/platform logic\ndocument.addEventListener('keydown', e => {\n  if (e.key === ' ' && player.vy === 0) player.vy = -5;\n});`;
    }
    if (label.includes('collectible') || label.includes('coin')) {
      return `// Add collectible items and scoring\nconst coins = [ { x: 100, y: 200, w: 8, h: 8, collected: false } ];\nlet score = 0;`;
    }
    if (label.includes('obstacle')) {
      return `// Add obstacles and collision logic\nconst obstacles = [ { x: 150, y: 210, w: 16, h: 16 } ];`;
    }
    if (label.includes('win/lose') || label.includes('win')) {
      return `// Implement win/lose condition and display result\nfunction checkWin() {\n  if (score >= coins.length) {\n    ctx.fillText('You win!', 120, 120);\n  }\n}`;
    }
    return `// Step ${step.id}: ${step.label}\n// ...code...`;
  } catch (err) {
    logger.error('StepBuilderAgent error', { traceId, error: err, step });
    throw err;
  }
}

module.exports = StepBuilderAgent; 