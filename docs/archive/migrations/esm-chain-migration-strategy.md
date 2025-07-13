# Selective ESM Migration Strategy: Chain Modules Only

> **⚠️ WARNING: This is NOT a full ESM migration. Only chain modules and their tests will be migrated to ESM. All other code (controllers, server entrypoints, legacy modules, etc.) will remain in CommonJS (CJS).**

## Objective
Migrate only the LangChain-dependent chain modules and their tests to ESM (ECMAScript Modules), while keeping the rest of the codebase (controllers, server entrypoints, legacy modules) in CommonJS (CJS). This enables clean dependency injection, robust testing, and future-proof code, without requiring a full repo migration.

---

## Step-by-Step Plan

### 1. Rename Chain Modules and Tests to `.mjs`
- For each chain (e.g., `IdeaGeneratorChain.js`), rename to `IdeaGeneratorChain.mjs`.
- Do the same for their test files (e.g., `IdeaGeneratorChain.test.js` → `IdeaGeneratorChain.test.mjs`).

### 2. Update Imports/Exports
- Change all `require`/`module.exports` to `import`/`export` syntax in the `.mjs` files.
- Use ESM-style imports for LangChain and other ESM-only dependencies.

### 3. Dependency Injection (DI)
- Ensure each chain accepts an LLM instance via its constructor or factory function.
- No special logic for mocks; just use the injected dependency.

### 4. Update Tests
- Use ESM syntax in tests (`import`, `export`).
- Inject mocks directly into the chain for unit tests.
- If you use Jest, ensure your Jest config treats `.mjs` as ESM (e.g., `extensionsToTreatAsEsm: ['.mjs']`).

### 5. Keep a Thin CJS Adapter (if needed)
- If other CJS code needs to call the chain, create a tiny CJS file:
  ```js
  // IdeaGeneratorChain.js (CJS)
  module.exports = require('./IdeaGeneratorChain.mjs');
  ```
- Or use dynamic `import()` in CJS code.

### 6. Configure Node and Jest
- No need to set `"type": "module"` globally—just rely on `.mjs` extensions.
- For Jest, always run with `--experimental-vm-modules` or use an ESM-compatible runner.

### 7. Test Everything
- Run your ESM tests to ensure chains work with both real and mock LLMs.
- Run your CJS integration code to ensure it can still call the ESM chains.

---

## Example: Migrating `IdeaGeneratorChain`

### `IdeaGeneratorChain.mjs`
```js
import { ChatOpenAI } from '@langchain/openai';
import { somePrompt } from '../../prompts/design/idea-generator.mjs';

export function createIdeaGeneratorChain(llm) {
  return {
    async invoke(input) {
      if (!input || typeof input !== 'object') {
        throw new Error('Input must be an object');
      }
      // Use injected LLM (mock or real)
      const result = await llm.call(input);
      if (!result || typeof result !== 'object' || typeof result.content !== 'string') {
        throw new Error('Output missing required fields');
      }
      // Parse content as before...
      // ...
      return { title, pitch };
    }
  };
}
```

### `IdeaGeneratorChain.test.mjs`
```js
import { createIdeaGeneratorChain } from './IdeaGeneratorChain.mjs';

describe('IdeaGeneratorChain', () => {
  it('parses LLM output', async () => {
    const mockLLM = { call: async () => ({ content: 'Title: Foo\nPitch: Bar' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    const result = await chain.invoke({ constraints: 'foo' });
    expect(result).toHaveProperty('title', 'Foo');
    expect(result).toHaveProperty('pitch', 'Bar');
  });
});
```

### `IdeaGeneratorChain.js` (CJS Adapter, optional)
```js
module.exports = require('./IdeaGeneratorChain.mjs');
```

---

## Running ESM (Vitest) and CJS (Jest) Tests

### Test Scripts

- **Run ESM tests only (Vitest):**
  ```sh
  npm run test:vitest
  ```
- **Run CJS tests only (Jest):**
  ```sh
  npm run test:jest
  ```
- **Run all tests (CJS + ESM):**
  ```sh
  npm test
  ```

These scripts are defined in the root `package.json`:
```json
  "scripts": {
    "test:vitest": "vitest",
    "test:jest": "node --experimental-vm-modules ./node_modules/.bin/jest",
    "test": "npm run test:jest && npm run test:vitest"
  }
```

### Troubleshooting ESM/uuid Issues
- If you see errors like `Cannot read properties of undefined (reading 'v1')` from `uuid`, ensure:
  - All `uuid` versions are pinned to `^10.0.0` using the `overrides` field in `package.json`.
  - Your `vitest.config.js` aliases `uuid` to its ESM entry:
    ```js
    resolve: {
      alias: {
        uuid: 'uuid/dist/esm-browser/index.js',
      }
    }
    ```
  - Remove `uuid` from `noExternal` and `optimizeDeps.include` in Vitest config.
- Clean your install if issues persist:
  ```sh
  rm -rf node_modules package-lock.json
  npm install
  ```

---

## Benefits
- Clean DI and testability for chains
- Minimal disruption to the rest of the codebase (which stays CJS)
- Future-proof: You can migrate more modules to ESM gradually if desired

---

## Notes
- **This strategy applies ONLY to chain modules and their tests.** All other code remains in CommonJS (CJS).
- This pattern is especially useful for ESM-only libraries (like LangChain).
- Use `.mjs` extension to avoid changing global module type.
- For Jest, prefer running with `--experimental-vm-modules` for ESM test support.
