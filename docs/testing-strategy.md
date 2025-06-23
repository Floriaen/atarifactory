> **Deprecation Notice:** This document is for archival reference only. For the current testing strategy and pipeline, see [../pipeline-v3-design.md](../pipeline-v3-design.md) and the [root README](../../README.md).

# Testing Strategy

## Overview

This document outlines our testing strategy for the game generation pipeline. Our testing approach is designed to ensure reliability, maintainability, and confidence in our codebase through a multi-layered testing strategy.

## Test Layers

### 1. Unit Tests
**Location:** `server/tests/unit/`

Unit tests focus on testing individual components in isolation. Each test should:
- Test a single function or agent
- Mock all dependencies
- Be fast and deterministic
- Cover edge cases and error scenarios

Example:
```javascript
// GameDesignAgent.test.js
describe('GameDesignAgent', () => {
  it('should generate valid game definition', async () => {
    const mockLlmClient = new MockSmartOpenAI();
    const result = await GameDesignAgent({ title: 'Test Game' }, { llmClient: mockLlmClient });
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('mechanics');
  });
});
```

### 2. Integration Tests
**Location:** `server/tests/integration/`

Integration tests verify that multiple components work together correctly. They:
- Test interactions between agents
- Use real code flow but mock external dependencies
- Verify data transformation between steps
- Test error handling and recovery

Example:
```javascript
// pipeline-integration.test.js
describe('Pipeline Integration', () => {
  it('should process game design through to code generation', async () => {
    const gameDef = await GameDesignAgent({ title: 'Test Game' }, { llmClient: mockLlmClient });
    const plan = await PlannerAgent({ gameDef }, { llmClient: mockLlmClient });
    const code = await StepBuilderAgent({ plan }, { llmClient: mockLlmClient });
    expect(code).toBeValidJavaScript();
  });
});
```

### 3. End-to-End (E2E) Tests
**Location:** `server/tests/e2e/`

E2E tests verify the entire system works as expected. They:
- Test complete user flows
- Use the real API endpoints
- Can run with either real or mock LLM
- Verify the entire pipeline from request to response

Example:
```javascript
// pipeline-endpoint.test.js
describe('POST /api/pipeline-v2/generate', () => {
  it('should generate complete game from title', async () => {
    const response = await request(app)
      .post('/api/pipeline-v2/generate')
      .send({ title: 'Test Game' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('gameDef');
    expect(response.body).toHaveProperty('code');
  });
});
```

## Test Data and Fixtures

**Location:** `server/tests/fixtures/`

Store reusable test data in the fixtures directory:
- Sample game definitions
- Example plans
- Test code snippets
- Mock LLM responses

Example:
```javascript
// Using fixtures
const sampleGameDef = require('../fixtures/sample-game-def.json');
const samplePlan = require('../fixtures/sample-plan.json');
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test layers
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with real LLM (requires OPENAI_API_KEY)
OPENAI_API_KEY=sk-... npm test

# Run with verbose logging
TEST_LOGS=1 npm test
```

### Test Modes

1. **Mock Mode (Default)**
   - Uses `MockSmartOpenAI` for all LLM calls
   - Fast and deterministic
   - Good for CI and development

2. **Real LLM Mode**
   - Uses actual OpenAI API
   - Requires `OPENAI_API_KEY`
   - Good for smoke tests and verification

3. **Logging Mode**
   - Set `TEST_LOGS=1` for verbose output
   - Shows detailed pipeline progress
   - Helpful for debugging

## Writing Tests

### LLM Mocking Guidelines

- **Use `MockLLM`** for all tests where you want to simulate valid, malformed, or edge-case LLM output. This ensures your tests mimic real LLM output shape and behavior, and keeps your mapping steps clean and consistent.
- **Use a simple throwing stub** (e.g., `{ invoke: async () => { throw new Error('Should not be called'); } }`) for tests where the LLM should never be called (such as input validation or short-circuit logic). This makes the test's intent explicit and guarantees the LLM is not invoked.
- Do not over-engineer negative-path tests by subclassing `MockLLM` to throw—direct stubs are clearer for these cases.

This pattern is used throughout the design chain unit tests (see `EntityListBuilderChain.test.mjs` for examples).

### Best Practices

1. **Test Structure**
   ```javascript
   describe('ComponentName', () => {
     // Setup
     beforeEach(() => {
       // Common setup
     });

     // Happy path
     it('should do something expected', async () => {
       // Test code
     });

     // Edge cases
     it('should handle edge case', async () => {
       // Test code
     });

     // Error cases
     it('should handle error gracefully', async () => {
       // Test code
     });
   });
   ```

2. **Mocking**
   - Mock external dependencies
   - Use realistic mock data
   - Reset mocks between tests

3. **Assertions**
   - Be specific in expectations
   - Test both success and failure cases
   - Verify side effects

### Test Documentation

Each test file should include:
- Purpose of the test
- What is being tested
- What is mocked
- How to run in different modes

Example:
```javascript
/**
 * Tests the GameDesignAgent's ability to generate game definitions.
 * 
 * Modes:
 * - Mock LLM: Default
 * - Real LLM: Set OPENAI_API_KEY
 * - Logging: Set TEST_LOGS=1
 */
```

## Continuous Integration

Our CI pipeline:
1. Runs all tests on every PR
2. Fails if any test fails
3. Optionally runs real LLM tests on schedule
4. Generates coverage reports

## Coverage Goals

- Unit Tests: >90% coverage
- Integration Tests: >80% coverage
- E2E Tests: Critical paths only

## Adding New Tests

1. Choose the appropriate test layer
2. Create test file in correct directory
3. Write tests following best practices
4. Add fixtures if needed
5. Update documentation
6. Run tests locally
7. Submit PR

## Debugging Tests

1. Use `TEST_LOGS=1` for verbose output
2. Check mock responses
3. Verify test data
4. Use Jest's `--verbose` flag
5. Check coverage reports

## Common Issues and Solutions

1. **Flaky Tests**
   - Ensure proper async handling
   - Reset mocks between tests
   - Use deterministic test data

2. **Slow Tests**
   - Use mock LLM by default
   - Optimize test data
   - Run only necessary tests during development

3. **Missing Coverage**
   - Add unit tests for untested code
   - Expand integration tests
   - Add edge cases

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://jestjs.io/docs/best-practices)
- [Mocking Guide](https://jestjs.io/docs/mock-functions) 