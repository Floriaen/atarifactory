// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const StaticCheckerAgent = require('../../agents/StaticCheckerAgent');
const { createSharedState } = require('../../types/SharedState');
const MockOpenAI = require('../mocks/MockOpenAI');

const llmClient = new MockOpenAI();
llmClient.setAgent('StaticCheckerAgent');

describe('StaticCheckerAgent', () => {
  let sharedState;

  beforeEach(() => {
    sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = '// new logic';
  });

  it('should return an array of errors after static check', async () => {
    const result = await StaticCheckerAgent(sharedState, { logger, traceId: 'test-trace', llmClient });
    expect(Array.isArray(result)).toBe(true);
    expect(sharedState.errors).toBeDefined();
    expect(Array.isArray(sharedState.errors)).toBe(true);
  });

  it('should detect syntax errors in code', async () => {
    sharedState.stepCode = 'function update() {'; // Place invalid code in stepCode, which is now checked
    const result = await StaticCheckerAgent(sharedState, { logger, traceId: 'test-trace', llmClient });
    expect(sharedState.errors.length).toBeGreaterThan(0);
    expect(sharedState.errors[0].message).toMatch(/unexpected|syntax/i);
  });

  it('should handle empty code gracefully', async () => {
    sharedState.currentCode = '';
    sharedState.stepCode = '';
    const result = await StaticCheckerAgent(sharedState, { logger, traceId: 'test-trace', llmClient });
    expect(Array.isArray(result)).toBe(true);
    expect(sharedState.errors.length).toBe(0);
  });

  it.skip('should detect duplicate function declarations', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'function update() {}';
    const result = await StaticCheckerAgent(sharedState, { logger, traceId: 'dup-fn', llmClient });
    expect(result.some(e => e.includes('Duplicate declaration: update'))).toBe(true);
  });

  it.skip('should detect undeclared variables', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'console.log(x);';
    const result = await StaticCheckerAgent(sharedState, { logger, traceId: 'undeclared', llmClient });
    expect(result.some(e => e.includes('Undeclared variable: x'))).toBe(true);
  });
}); 