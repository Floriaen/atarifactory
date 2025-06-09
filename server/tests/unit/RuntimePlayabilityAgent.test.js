// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;

jest.setTimeout(20000);

describe('RuntimePlayabilityAgent', () => {
  it('should return all booleans (placeholder)', async () => {
    const code = '// placeholder game code';
    const result = await RuntimePlayabilityAgent({ code }, { logger: console, traceId: 'test' });
    expect(typeof result).toBe('object');
    expect(typeof result.canvasActive).toBe('boolean');
    expect(typeof result.inputResponsive).toBe('boolean');
    expect(typeof result.playerMoved).toBe('boolean');
    expect(typeof result.winConditionReachable).toBe('boolean');
  });
  // More tests will be added as the agent is implemented
  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid runtime result from real OpenAI', async () => {
    // To be implemented if RuntimePlayabilityAgent becomes LLM-driven
    expect(true).toBe(true);
  });
  it('should detect input responsiveness (ArrowRight)', async () => {
    const code = `
      window.keys = {};
      window.addEventListener('keydown', e => { window.keys[e.key] = true; });
      window.addEventListener('keyup', e => { window.keys[e.key] = false; });
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
    `;
    const result = await RuntimePlayabilityAgent({ code }, { logger: console, traceId: 'input-test' });
    expect(result.canvasActive).toBe(true);
    expect(result.inputResponsive).toBe(true);
  });
  it('should detect player movement in response to input', async () => {
    const code = `
      window.player = { x: 0, y: 0 };
      window.keys = {};
      window.addEventListener('keydown', e => {
        window.keys[e.key] = true;
        if (e.key === 'ArrowRight') window.player.x += 5;
      });
      window.addEventListener('keyup', e => { window.keys[e.key] = false; });
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
    `;
    const result = await RuntimePlayabilityAgent({ code }, { logger: console, traceId: 'move-test' });
    expect(result.canvasActive).toBe(true);
    expect(result.inputResponsive).toBe(true);
    expect(result.playerMoved).toBe(true);
  });
  it('should detect win condition after simulated input', async () => {
    const code = `
      window.player = { x: 0, y: 0 };
      window.keys = {};
      window.win = false;
      window.addEventListener('keydown', e => {
        window.keys[e.key] = true;
        if (e.key === 'ArrowRight') {
          window.player.x += 5;
          if (window.player.x >= 40) window.win = true;
        }
      });
      window.addEventListener('keyup', e => { window.keys[e.key] = false; });
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
    `;
    const result = await RuntimePlayabilityAgent({ code }, { logger: console, traceId: 'win-test' });
    expect(result.canvasActive).toBe(true);
    expect(result.inputResponsive).toBe(true);
    expect(result.playerMoved).toBe(true);
    expect(result.winConditionReachable).toBe(true);
  });
}); 