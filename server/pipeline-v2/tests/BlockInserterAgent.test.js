// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const BlockInserterAgent = require('../agents/BlockInserterAgent');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
describe('BlockInserterAgent', () => {
  it('should return a string (new currentCode) after insertion/merge (MockSmartOpenAI)', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: '// new logic'
    };
    const result = BlockInserterAgent(input, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
  });

  it('should merge stepCode into an existing function if names match', () => {
    const input = {
      currentCode: 'function update() { console.log("old"); }',
      stepCode: 'function update() { console.log("new"); }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'merge-fn' });
    expect(result).toMatch(/function update\(\) \{[\s\S]*console\.log\("old"\);[\s\S]*console\.log\("new"\);[\s\S]*\}/);
  });

  it('should append a new function if not present in currentCode', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: 'function draw() { console.log("draw"); }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'append-fn' });
    expect(result).toMatch(/function update\(\) \{\}[\s\S]*function draw\(\) \{[\s\S]*console\.log\("draw"\);[\s\S]*\}/);
  });

  it('should append statements if stepCode is not a function', () => {
    const input = {
      currentCode: 'function update() {}',
      stepCode: 'const x = 42;'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'append-stmt' });
    expect(result).toMatch(/function update\(\) \{\}[\s\S]*const x = 42;/);
  });

  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid code merge from real OpenAI', async () => {
    // To be implemented if BlockInserterAgent becomes LLM-driven
    expect(true).toBe(true);
  });
}); 