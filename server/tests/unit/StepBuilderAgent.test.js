// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to enable console logs for debugging.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

const StepBuilderAgent = require('../../agents/StepBuilderAgent');
const createSharedState = require('../../types/SharedState').createSharedState;
const MockOpenAI = require('../mocks/MockOpenAI');
const Step = require('../../types/Step');

const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();

const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;

function setupTestState() {
  const sharedState = createSharedState();
  sharedState.currentCode = 'function update() { player.x += 5; }';
  sharedState.plan = [
    { id: 'step1', description: 'Update player movement', type: 'code' }
  ];
  sharedState.step = new Step('step1', 'Update player movement', 'code');
  
  const llmClient = new MockOpenAI();
  llmClient.setAgent('StepBuilderAgent');
  
  return { sharedState, llmClient };
}

describe('StepBuilderAgent', () => {
  it('should return a string (code block) for the step (MockOpenAI)', async () => {
    const { sharedState, llmClient } = setupTestState();
    const result = await StepBuilderAgent(sharedState, { logger, traceId: 'test', llmClient });
    expect(typeof result).toBe('string');
    expect(result).toContain('function update()');
  });

  // (useRealLLM ? it : it.skip)('should return a code block from real OpenAI', async () => {
  //   const sharedState = createSharedState();
  //   sharedState.currentCode = '// code so far';
  //   sharedState.plan = [
  //     { id: 1, label: 'Setup' },
  //     { id: 2, label: 'Add player' }
  //   ];
  //   sharedState.step = { id: 2, label: 'Add player' };

  //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //   const llmClient = new SmartOpenAI(openai);
  //   const result = await StepBuilderAgent(sharedState, { logger, traceId: 'real-openai-test', llmClient });
  //   expect(typeof result).toBe('string');
  //   expect(result.length).toBeGreaterThan(0);
  //   expect(sharedState.currentCode).toBe(result);
  //   expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  // });

  it('StepBuilderAgent returns code with markdown block markers', async () => {
    const { sharedState, llmClient } = setupTestState();
    const result = await StepBuilderAgent(sharedState, { logger, traceId: 'test', llmClient });
    expect(result).toMatch(/```javascript/);
    expect(result).toMatch(/```$/);
  });
}); 