# Design Chain Implementation & Testing Template

## Overview

This guide standardizes the implementation of all *design chain agents* in the codebase. All new and refactored chains should use the `createJsonExtractionChain` utility for robust, maintainable, and testable LCEL pipelines.

---

## 1. Chain Implementation Pattern

### 1.1. File Structure

- Chain file: `server/agents/chains/design/<chain-name>.mjs`
- Prompt file: `server/agents/prompts/design/<chain-name>.md`
- Unit test: `server/tests/unit/design/<chain-name>.test.mjs`
- Integration test: `server/tests/integration/design/<chain-name>.openai.test.mjs` (if needed)

### 1.2. Chain Construction

**Always use the utility:**

```js
import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/<chain-name>.md');

function create<ChainName>(llm) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['input1', 'input2'], // e.g., ['loop']
    schemaName: '<output description>' // e.g., 'mechanics array'
  });
}

export { create<ChainName> };
```

**Prompt file** must instruct the LLM to respond with a strict JSON object matching the required schema.

---

## 2. Testing Pattern

### 2.1. Unit Tests

- Use `MockLLM` to simulate LLM responses.
- Use `FlexibleMalformedLLM` to simulate error cases.
- Always test:
  - Happy path (valid input/output)
  - Input validation (missing/invalid fields)
  - LLM output validation (malformed, missing content, schema mismatch)

**Example:**
```js
import { create<ChainName> } from '../../../agents/chains/design/<chain-name>.mjs';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

// Happy path
it('extracts ... (happy path)', async () => {
  const mockLLM = new MockLLM(JSON.stringify({ ... }));
  const chain = create<ChainName>(mockLLM);
  const input = { ... };
  const result = await chain.invoke(input);
  // assertions...
});

// Input validation
it('throws if input is missing', async () => {
  const chain = create<ChainName>(new MockLLM(JSON.stringify({ ... })));
  await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: ...');
});
```

### 2.2. Integration Tests

- Use a real LLM (e.g., `ChatOpenAI`) and check for API key/model in `.env`.
- Only run if credentials are present.
- Assert that the contract holds for real LLM output.

---

## 3. Utility: `createJsonExtractionChain`

- Handles prompt loading, format instructions, mapping, parsing, and error handling.
- Enforces explicit LLM injection and strict input/output contracts.
- See `server/utils/createJsonExtractionChain.mjs` for API.

---

## 4. Prompt & Parser Contract

- Prompt must include a JSON schema and example.
- Parser expects output to match the schema exactly.
- Tests must use the same contract as the prompt and parser.

---

## 5. Checklist for New Chains

- [ ] Prompt file created with strict JSON schema and example.
- [ ] Chain implemented using `createJsonExtractionChain`.
- [ ] Unit tests for happy path and all error cases.
- [ ] Integration test (if needed) using real LLM.
- [ ] All tests pass with `vitest`.

---

## 6. Example

**See**  
- `MechanicExtractorChain.mjs`  
- `MechanicExtractorChain.test.mjs`  
- `MechanicExtractorChain.openai.test.mjs`

for a complete, up-to-date reference implementation.
