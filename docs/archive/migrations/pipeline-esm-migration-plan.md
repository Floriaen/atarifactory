# Pipeline ESM Migration Plan

This document outlines the step-by-step plan to migrate the main pipeline and integration layer from CommonJS (CJS) to ECMAScript Modules (ESM) so that modern ESM design chains can be used natively, while minimizing changes to the rest of the codebase.

---

## Why Migrate the Pipeline to ESM?
- Node.js does **not** allow CJS (`require`) to import ESM modules directly.
- The new design chains are ESM-only and cannot be used from CJS code.
- Migrating the pipeline to ESM allows seamless use of both new ESM modules and legacy CJS modules.

---

## Migration Principles
- **Keep the migration surface minimal:** Only migrate the pipeline and its direct dependents to ESM.
- **Preserve legacy CJS modules:** Utilities and business logic can remain CJS and be imported into ESM as needed.
- **Incremental migration:** No need to migrate the entire codebase to ESM at once.

---

## Step-by-Step Migration Plan

### 1. Identify Pipeline Entry Points
- Locate all main pipeline files (e.g., `server/agents/pipeline/planningPipeline.js`).
- Identify all files that directly `require` or import the pipeline.

### 2. Convert Pipeline Files to ESM
- Rename `*.js` pipeline files to `*.mjs` (e.g., `planningPipeline.js` → `planningPipeline.mjs`).
- Add/update `package.json` fields if needed (e.g., set `type: "module"` in the relevant package or use `.mjs` extensions).
- Replace all `require`/`module.exports` in these files with ESM `import`/`export` syntax.

### 3. Update Imports in Pipeline
- For ESM modules (e.g., design chains):
  ```js
  import { createGameDesignChain } from '../chains/design/GameDesignChain.mjs';
  ```
- For legacy CJS modules:
  ```js
  import legacyUtil from '../legacyUtil.js'; // For default export
  import * as legacyUtil from '../legacyUtil.js'; // For named exports
  ```

### 4. Update All Direct Pipeline Consumers
- Any file that imports/requires the pipeline must also be ESM or use dynamic `import()` (see notes below).
- For integration tests or scripts, consider renaming to `.mjs` and updating to ESM syntax.

### 5. Test the Migration
- Run all ESM and CJS unit tests to ensure nothing is broken.
- Run integration and e2e tests, updating them to ESM as needed.

### 6. (Optional) Gradually Migrate More Code
- As needed, migrate additional modules/utilities to ESM.
- There is no rush—ESM can import CJS, so you can proceed incrementally.

---

## FAQ & Best Practices

### Can ESM import CJS modules?
**Yes.** ESM can import CJS modules with either default or namespace imports. No changes needed to CJS modules.

### Can CJS import ESM modules?
**No.** CJS cannot use `require()` to load ESM modules. Use dynamic `import()` as a workaround, but this is not recommended for core app code.

### What about integration/e2e tests?
- If they import the pipeline, migrate them to ESM (`.mjs`), or use dynamic `import()`.
- This ensures full compatibility with ESM-only modules.

### What if I need to keep an entry point in CJS?
- You can use dynamic `import()` to load the ESM pipeline, but the code will need to be async.
- For best maintainability, prefer migrating the entry point to ESM if possible.

---

## Example: Migrating the Planning Pipeline

**Before:**
```js
// planningPipeline.js (CJS)
const { createGameDesignChain } = require('../chains/design/GameDesignChain'); // Fails if ESM
```

**After:**
```js
// planningPipeline.mjs (ESM)
import { createGameDesignChain } from '../chains/design/GameDesignChain.mjs'; // Works!
```

---

## Next Steps
1. Rename the pipeline file(s) to `.mjs` and update to ESM syntax.
2. Update all direct consumers to use ESM imports.
3. Test thoroughly.
4. Migrate additional files to ESM as needed.

---

**This migration plan enables you to use your modern ESM design chains in the pipeline while keeping the rest of your codebase stable and minimizing disruption.**
