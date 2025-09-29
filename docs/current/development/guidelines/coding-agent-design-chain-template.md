# Design Chain Implementation & Testing Template

## Overview

This guide standardizes the implementation of all *design chain agents* in the codebase. All new and refactored chains should use the modern **chainFactory** utilities for robust, maintainable, and testable LCEL pipelines with structured output support.

---

## 1. Chain Implementation Pattern

### 1.1. File Structure

- Chain file: `server/agents/chains/design/<chain-name>.js`
- Prompt file: `server/agents/prompts/design/<ChainName>.prompt.md`
- Unit test: `server/tests/unit/design/<chain-name>.test.js`
- Integration test: `server/tests/integration/design/<chain-name>.openai.test.js` (if needed)

### 1.2. Chain Construction

**Always use the modern chainFactory utilities:**

```js
import { createStandardChain } from '../../../utils/chainFactory.js';
import { <chainName>Schema } from '../../../schemas/langchain-schemas.js';

async function create<ChainName>(llm, options = {}) {
  const { sharedState } = options;
  
  return await createStandardChain({
    chainName: '<ChainName>',
    promptFile: 'design/<ChainName>.prompt.md',
    inputVariables: ['input1', 'input2'], // e.g., ['loop']
    schema: <chainName>Schema, // Zod schema for structured output
    preset: 'structured', // or 'creative', 'planning', 'validation'
    llm,
    sharedState // for token counting and callbacks
  });
}

export { create<ChainName> };
```

**Alternative specialized factories:**
- `createJSONChain()` - For JSON extraction chains
- `createCreativeChain()` - For creative/generative chains  
- `createValidationChain()` - For validation chains

**Prompt file** should provide clear instructions for the expected output format. When using structured output, the LLM will automatically follow the Zod schema.

---

## 2. Testing Pattern

### 2.1. Unit Tests

- Use `MockLLM` to simulate LLM responses with structured output support.
- Use `FlexibleMalformedLLM` to simulate error cases.
- Always test:
  - Happy path (valid input/output)
  - Input validation (missing/invalid fields)
  - LLM output validation (malformed, missing content, schema mismatch)

**Example:**
```js
import { create<ChainName> } from '../../../agents/chains/design/<chain-name>.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

// Happy path
it('extracts ... (happy path)', async () => {
  const mockLLM = new MockLLM({ ... }); // Direct object, not JSON string
  const chain = await create<ChainName>(mockLLM); // Note: await for async chain creation
  const input = { ... };
  const result = await chain.invoke(input);
  // assertions...
});

// Input validation
it('throws if input is missing', async () => {
  const chain = await create<ChainName>(new MockLLM({ ... })); // Note: await
  await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: ...');
});

// Token counting
it('should increment sharedState.tokenCount when provided', async () => {
  const sharedState = { tokenCount: 0 };
  const chain = await create<ChainName>(new MockLLM({ ... }), { sharedState });
  await chain.invoke({ ... });
  expect(sharedState.tokenCount).toBeGreaterThan(0);
});
```

### 2.2. Integration Tests

- Use a real LLM (e.g., `ChatOpenAI`) and check for API key/model in `.env`.
- Only run if credentials are present.
- Assert that the contract holds for real LLM output and structured output works correctly.

---

## 3. Modern Chain Architecture

### 3.1. chainFactory Utilities

- **`createStandardChain()`**: Core factory with full configuration options
- **`createJSONChain()`**: Specialized for JSON extraction with structured output
- **`createCreativeChain()`**: Optimized for creative/generative tasks
- **`createValidationChain()`**: Specialized for validation tasks

### 3.2. Key Features

- **Structured Output**: Automatic schema validation using Zod
- **Token Counting**: Built-in token tracking with callbacks
- **Error Handling**: Comprehensive error handling and logging
- **Presets**: Pre-configured LLM settings (creative, structured, planning, validation)
- **Async Support**: Modern async/await patterns throughout

### 3.3. Schema Definition

Define schemas in `server/schemas/langchain-schemas.js`:

```js
export const <chainName>Schema = z.object({
  field1: z.string().min(1, 'Field1 is required'),
  field2: z.array(z.string()).min(1, 'At least one item required')
});
```

---

## 4. Configuration & Presets

### 4.1. Available Presets

- **`structured`**: Precise, deterministic output (temperature: 0.1)
- **`creative`**: Balanced creativity and control (temperature: 0.7)  
- **`planning`**: Logical, step-by-step reasoning (temperature: 0.3)
- **`validation`**: Conservative, accurate validation (temperature: 0.1)

### 4.2. Custom Configuration

```js
import { createStandardLLM } from '../../../config/langchain.config.js';

const customLLM = createStandardLLM({
  model: 'gpt-4',
  temperature: 0.5,
  maxTokens: 1024
});
```

---

## 5. Checklist for New Chains

- [ ] Zod schema defined in `langchain-schemas.js`
- [ ] Prompt file created with clear instructions
- [ ] Chain implemented using appropriate chainFactory function
- [ ] Unit tests for happy path, input validation, and error cases
- [ ] Token counting test included
- [ ] Integration test (if needed) using real LLM
- [ ] All tests pass with `vitest`
- [ ] Chain creation is async and properly awaited

---

## 6. Examples

**See these reference implementations:**
- `IdeaGeneratorChain.js` - Creative chain with structured output
- `MechanicExtractorChain.js` - JSON extraction chain  
- `PlayabilityHeuristicChain.js` - Validation chain
- `PlannerChain.js` - Planning chain with array output

**For complete examples of modern patterns and testing approaches.**
