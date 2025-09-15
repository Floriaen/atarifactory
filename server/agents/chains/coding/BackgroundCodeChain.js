import { createStandardChain } from '../../../utils/chainFactory.js';
import { backgroundCodeSchema } from '../../../schemas/langchain-schemas.js';

export const CHAIN_STATUS = {
  name: 'BackgroundCodeChain',
  label: 'Background Code',
  description: 'Generating Atari-style background code',
  category: 'coding'
};

async function createBackgroundCodeChain(llm, options = {}) {
  // Fall back to a deterministic stub when the provided instance lacks structured output helpers
  const safeLLM = llm && typeof llm.withStructuredOutput === 'function' ? llm : undefined;
  if (!safeLLM) {
    return {
      async invoke() {
        return {
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
          notes: 'Fallback stub background (no LLM available)'
        };
      }
    };
  }

  return await createStandardChain({
    chainName: 'BackgroundCodeChain',
    promptFile: 'coding/background-code.md',
    inputVariables: ['context'],
    schema: backgroundCodeSchema,
    preset: 'structured',
    llm: safeLLM,
    sharedState: options.sharedState
  });
}

export { createBackgroundCodeChain };
