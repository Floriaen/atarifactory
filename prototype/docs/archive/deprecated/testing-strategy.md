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
// GameInventorChain.test.js
describe('GameInventorChain', () => {
  it('should generate valid game definition', async () => {
    const mockResponse = { name: 'Test Game', description: 'A test game' };
    const mockLLM = new MockLLM(mockResponse);
    const chain = await createGameInventorChain(mockLLM); // Note: await for async chains
    const result = await chain.invoke({ input: 'create a space game' });
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('description');
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
// gameDesignPipeline.integration.test.js
describe('Game Design Pipeline Integration', () => {
  it('should process game idea through to final assembly', async () => {
    const sharedState = { tokenCount: 0 };
    const mockLLM = new MockLLM(mockGameDesignResponse);
    
    const gameDesignChain = await createGameDesignChain({ llm: mockLLM, sharedState });
    const result = await gameDesignChain.invoke({ input: 'space adventure' });
    
    expect(result).toHaveProperty('finalDesign');
    expect(sharedState.tokenCount).toBeGreaterThan(0);
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
describe('POST /api/pipeline-v3/generate', () => {
  it('should generate complete game from title', async () => {
    const response = await request(app)
      .post('/api/pipeline-v3/generate')
      .send({ title: 'Test Game' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('gameId');
    expect(response.body).toHaveProperty('status');
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
   - Uses `MockLLM` for all LLM calls with structured output support
   - Fast and deterministic
   - Good for CI and development

2. **Real LLM Mode**
   - Uses actual OpenAI API with structured output
   - Requires `OPENAI_API_KEY`
   - Good for smoke tests and verification

3. **Logging Mode**
   - Set `TEST_LOGS=1` for verbose output
   - Shows detailed chain execution and token counting
   - Helpful for debugging

## Writing Tests

### LLM Mocking Guidelines

- **Use `MockLLM`** for all tests where you want to simulate valid, well-formed LLM output with structured output support.
- **Use `FlexibleMalformedLLM`** for negative-path tests where you want to simulate malformed, missing, or otherwise invalid LLM output.
- **Use a simple throwing stub** (e.g., `{ invoke: async () => { throw new Error('Should not be called'); } }`) for tests where the LLM should never be called (such as input validation or short-circuit logic).

#### Modern MockLLM with Structured Output

`MockLLM` now supports the modern `.withStructuredOutput()` pattern and automatically validates against Zod schemas:

```js
import { MockLLM } from '../../helpers/MockLLM.js';

// Direct object response (automatically validated against schema)
const mockResponse = { name: 'Test Game', description: 'A test description' };
const mockLLM = new MockLLM(mockResponse);
const chain = await createGameInventorChain(mockLLM); // Note: await for async chain creation
```

#### FlexibleMalformedLLM Usage

`FlexibleMalformedLLM` simulates various malformed outputs for negative testing:

- `'missingContent'`: returns an object with no `.content` property (legacy chains only)
- `'invalidSchema'`: returns data that violates the Zod schema
- `'throwError'`: throws an error during invocation

**Example:**
```js
import { FlexibleMalformedLLM } from '../tests/helpers/MalformedLLM.js';

// Test schema validation failure
const llm = new FlexibleMalformedLLM('invalidSchema');
const chain = await createGameInventorChain(llm);
await expect(chain.invoke({ input: 'test' })).rejects.toThrow();
```

### Modern Chain Composition with chainFactory

**IMPORTANT:** Manual LCEL composition is deprecated. Use the chainFactory utilities instead:

```javascript
import { createStandardChain } from '../utils/chainFactory.js';

// DEPRECATED: Manual LCEL composition
const chain = prompt.pipe(llm).pipe(parser);

// CURRENT: Use chainFactory with structured output
const chain = await createStandardChain({
  chainName: 'MyChain',
  promptFile: 'MyChain.prompt.md',
  inputVariables: ['input'],
  schema: mySchema, // Zod schema for validation
  preset: 'structured',
  llm,
  sharedState
});
```

Benefits of the chainFactory approach:
- Automatic structured output with Zod validation
- Built-in token counting and logging
- Consistent error handling across all chains
- No manual content parsing needed

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
4. Use Vitest's `--reporter=verbose` flag
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

- [Vitest Documentation](https://vitest.dev/guide/)
- [Testing Best Practices](https://vitest.dev/guide/features.html)
- [Mocking Guide](https://vitest.dev/guide/mocking.html) 