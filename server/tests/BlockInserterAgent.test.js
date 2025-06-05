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

  it('should merge functions with early returns without breaking logic', () => {
    const input = {
      currentCode: 'function foo() { if (a) return 1; return 2; }',
      stepCode: 'function foo() { if (b) return 3; }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'early-return' });
    expect(result).toMatch(/function foo\(\) \{[\s\S]*if \(a\) return 1;[\s\S]*return 2;[\s\S]*if \(b\) return 3;[\s\S]*\}/);
  });

  it('should merge functions with variable shadowing safely', () => {
    const input = {
      currentCode: 'function bar() { let x = 1; return x; }',
      stepCode: 'function bar() { let x = 2; console.log(x); }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'shadowing' });
    expect(result).toMatch(/function bar\(\) \{[\s\S]*let x = 1;[\s\S]*return x;[\s\S]*let x = 2;[\s\S]*console\.log\(x\);[\s\S]*\}/);
  });

  it('should merge functions with different control flow', () => {
    const input = {
      currentCode: 'function baz() { for (let i = 0; i < 3; i++) { doA(); } }',
      stepCode: 'function baz() { while (true) { doB(); break; } }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'control-flow' });
    const noWS = s => s.replace(/\s+/g, '');
    expect(noWS(result)).toContain(noWS('for (let i = 0; i < 3; i++) { doA(); }'));
    expect(noWS(result)).toContain(noWS('while (true) { doB(); break; }'));
  });

  it('should merge multiple functions at once', () => {
    const input = {
      currentCode: 'function a() { return 1; } function b() { return 2; }',
      stepCode: 'function a() { doA(); } function c() { return 3; }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'multi-fn' });
    expect(result).toMatch(/function a\(\) \{[\s\S]*return 1;[\s\S]*doA\(\);[\s\S]*\}/);
    expect(result).toMatch(/function b\(\) \{[\s\S]*return 2;[\s\S]*\}/);
    expect(result).toMatch(/function c\(\) \{[\s\S]*return 3;[\s\S]*\}/);
  });

  it('should merge code with nested functions', () => {
    const input = {
      currentCode: 'function outer() { function inner() { return 1; } }',
      stepCode: 'function outer() { function inner2() { return 2; } }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'nested-fn' });
    const noWS = s => s.replace(/\s+/g, '');
    expect(noWS(result)).toContain(noWS('function inner() { return 1; }'));
    expect(noWS(result)).toContain(noWS('function inner2() { return 2; }'));
  });

  it('should merge code with comments and formatting differences', () => {
    const input = {
      currentCode: 'function foo() { /* old */ return 1; }',
      stepCode: 'function foo() { // new\nreturn 2; }'
    };
    const result = BlockInserterAgent(input, { logger, traceId: 'comments' });
    expect(result).toMatch(/function foo\(\) \{[\s\S]*\/\* old \*\/[\s\S]*return 1;[\s\S]*\/\/ new[\s\S]*return 2;[\s\S]*\}/);
  });

  // Placeholder for real LLM test
  (useRealLLM ? it : it.skip)('should return a valid code merge from real OpenAI', async () => {
    // To be implemented if BlockInserterAgent becomes LLM-driven
    expect(true).toBe(true);
  });
}); 