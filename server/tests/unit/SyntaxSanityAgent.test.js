// Logging: By default, logs are suppressed for clean test output. Set TEST_LOGS=1 to print logs to the terminal for debugging. Logs are not persisted to a file by default.
// To run real LLM tests, set both TEST_LLM=1 and OPENAI_API_KEY=your-key.
const SyntaxSanityAgent = require('../../agents/SyntaxSanityAgent');
const createSharedState = require('../../types/SharedState').createSharedState;

// Suppress logs by default unless TEST_LOGS=1
const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('SyntaxSanityAgent', () => {
  it('should return valid: true for syntactically correct code', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function foo() { return 42; }';
    const result = SyntaxSanityAgent(sharedState, { logger, traceId: 'test' });
    expect(result).toEqual({ valid: true });
  });

  it('should return valid: false and error for invalid code', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function foo( {';
    const result = SyntaxSanityAgent(sharedState, { logger, traceId: 'test' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return valid: true for code with runtime errors (only syntax checked)', () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'throw new Error("fail at runtime");';
    const result = SyntaxSanityAgent(sharedState, { logger, traceId: 'runtime' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Placeholder for real LLM test
  // (useRealLLM ? it : it.skip)('should return a valid syntax check from real OpenAI', async () => {
  //   // To be implemented if SyntaxSanityAgent becomes LLM-driven
  //   expect(true).toBe(true);
  // });
}); 