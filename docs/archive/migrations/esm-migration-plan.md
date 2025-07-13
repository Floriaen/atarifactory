# ESM Migration Plan for Monorepo

## Objective
Migrate the entire backend (and tests) of the game-agent monorepo from CommonJS (CJS) to ECMAScript Modules (ESM) to enable compatibility with ESM-only dependencies (notably Langchain), modernize the codebase, and reduce future maintenance overhead.

---

## Why Migrate to ESM?
- **Langchain and other LLM libraries are ESM-only**: Cannot be required via CJS.
- **Node.js ecosystem is moving to ESM**: Future dependencies will increasingly drop CJS support.
- **Cleaner, more standard imports/exports**: Aligns with browser and modern JS tooling.
- **Monorepo consistency**: All packages, scripts, and tests will use a single module system.

---

## Migration Overview

1. **Preparation**
   - Audit current usage of `require`/`module.exports` and CJS patterns.
   - Identify all entry points, scripts, and test files using CJS.
   - Review all third-party dependencies for ESM compatibility.
   - Communicate migration plan to all contributors.

2. **Package Configuration**
   - Add `"type": "module"` to root `package.json` (and to any sub-packages if needed).
   - Update all scripts and entrypoints to `.js` ESM or `.mjs` as needed.

3. **Codebase Refactor**
   - Replace all `require()` with `import` statements.
   - Replace all `module.exports`/`exports` with `export`/`export default`.
   - Update all dynamic imports and path references (e.g., add `.js` extensions to imports).
   - Update any usage of `__dirname`, `__filename`, and `import.meta.url` (ESM equivalents).
   - Refactor any code that relies on CJS-specific features (e.g., top-level `await`, `__dirname`).

4. **Test Suite Refactor**
   - Convert all test files to ESM (use `import`/`export`).
   - Update test imports to use `.js` extensions.
   - Update Jest configuration:
     - Rename `jest.config.js` to `jest.config.mjs` if needed.
     - Use ESM export (`export default`).
     - Set `testEnvironment` to `node`.
     - If needed, add Babel or `ts-jest` transforms for ESM compatibility.
     - Consider using `node --experimental-vm-modules` if Jest still struggles with ESM.

5. **Scripts & Tooling**
   - Update all CLI tools, scripts, and dev tools to ESM.
   - Ensure all npm scripts, nodemon, and other runners are compatible with ESM.

6. **Monorepo & Workspace Coordination**
   - Ensure all workspace packages use compatible module settings.
   - Remove any duplicate or conflicting `node_modules`/dependency declarations.
   - Test workspace linking and cross-package imports under ESM.

7. **Testing & Validation**
   - Run all unit and integration tests.
   - Manually test all major flows (API, CLI, UI if relevant).
   - Validate LLM integration (Langchain, OpenAI, etc.) works end-to-end.
   - Check for any runtime or import errors.

8. **Documentation & Communication**
   - Update README and developer docs with ESM usage instructions.
   - Document any breaking changes or migration gotchas.
   - Announce migration to all contributors.

9. **Cleanup**
   - Remove obsolete CJS files, configs, and shims.
   - Remove any temporary migration scripts.
   - Ensure CI/CD is updated and passing with ESM.

---

## Detailed Step-by-Step Checklist

### Preparation
- [ ] List all files using `require`/`module.exports` (code & tests)
- [ ] List all scripts/entrypoints (bin, CLI, server, etc.)
- [ ] List all test files
- [ ] List all dependencies and check ESM/CJS compatibility
- [ ] Communicate plan to team

### Package Configuration
- [ ] Add `"type": "module"` to root `package.json`
- [ ] Add to sub-packages if needed (e.g., `server/package.json`)
- [ ] Update all entrypoints/scripts to `.js` or `.mjs`

### Codebase Refactor
- [ ] Replace all `require()` with `import`
- [ ] Replace all `module.exports`/`exports` with `export`/`export default`
- [ ] Add file extensions to all imports (e.g., `./foo.js`)
- [ ] Refactor `__dirname`, `__filename` to use ESM equivalents
- [ ] Refactor dynamic imports if needed

### Test Suite Refactor
- [ ] Convert all test files to ESM
- [ ] Update all test imports to ESM and use file extensions
- [ ] Update Jest config to ESM (`jest.config.mjs`)
- [ ] Set up Babel or `ts-jest` if needed for transforms
- [ ] Run Jest with `--experimental-vm-modules` if necessary

### Scripts & Tooling
- [ ] Update CLI/dev tools to ESM
- [ ] Ensure nodemon/dev scripts work with ESM

### Monorepo & Workspace Coordination
- [ ] Ensure all workspace packages use compatible module settings
- [ ] Remove duplicate/conflicting dependencies
- [ ] Test cross-package imports

### Testing & Validation
- [ ] Run all Jest unit/integration tests
- [ ] Manually test API, CLI, and LLM flows
- [ ] Validate Langchain and OpenAI integration

### Documentation & Communication
- [ ] Update README and dev docs for ESM
- [ ] Document breaking changes
- [ ] Announce migration completion

### Cleanup
- [ ] Remove obsolete CJS files/configs
- [ ] Remove migration scripts
- [ ] Ensure CI/CD is green

---

## Risks & Mitigations
- **Risk:** Some dependencies may not support ESM
  - **Mitigation:** Audit dependencies up front; use shims or forks if necessary
- **Risk:** Test runner (Jest) ESM support is incomplete
  - **Mitigation:** Use Babel, `ts-jest`, or experimental Node flags
- **Risk:** CI/CD or deployment scripts break
  - **Mitigation:** Test in staging before production
- **Risk:** Contributors have local issues
  - **Mitigation:** Provide clear upgrade/migration docs

---

## Dependency ESM Compatibility Audit

### Direct Dependencies

| Dependency              | Version      | ESM Support?      | Notes / Actions Needed                                      |
|-------------------------|-------------|-------------------|-------------------------------------------------------------|
| @langchain/core         | ^0.3.59     | **ESM only**      | ✅ Already ESM. All imports must use `import`/`export`.     |
| @langchain/openai       | ^0.5.13     | **ESM only**      | ✅ ESM only. No CJS support.                                |
| langchain               | ^0.3.29     | **ESM only**      | ✅ ESM only. Remove if using sub-packages.                  |
| cors                    | ^2.8.5      | CJS               | ⚠️ CJS only, but can be imported via `import cors from 'cors'` in ESM due to Node interop. |
| dotenv                  | ^16.5.0     | CJS               | ⚠️ CJS only, but works with ESM using `import dotenv from 'dotenv'`. |
| express                 | ^5.1.0      | CJS (interop)     | ⚠️ CJS, but works with ESM using default import.            |
| marked                  | ^15.0.12    | **ESM**           | ✅ ESM support.                                             |
| openai                  | ^5.5.1      | **ESM only**      | ✅ ESM only.                                                |
| prettier                | 2.8.8       | ESM/CJS           | ✅ Both supported.                                          |
| puppeteer               | ^24.10.0    | **ESM**           | ✅ ESM support.                                             |
| recast                  | ^0.23.11    | CJS               | ⚠️ CJS only. Use `import recast from 'recast'` in ESM.     |
| uuid                    | ^11.1.0     | **ESM**           | ✅ ESM support.                                             |
| winston                 | ^3.17.0     | CJS               | ⚠️ CJS only. Use `import winston from 'winston'` in ESM.   |
| zod                     | ^3.25.67    | **ESM**           | ✅ ESM support.                                             |

### Dev Dependencies

| Dependency              | Version      | ESM Support?      | Notes / Actions Needed                                      |
|-------------------------|-------------|-------------------|-------------------------------------------------------------|
| @babel/core, etc.       | ^7.x        | ESM/CJS           | ✅ Babel supports ESM.                                      |
| eslint                  | ^9.28.0     | ESM/CJS           | ✅ ESLint supports ESM.                                     |
| jest                    | ^30.0.2     | Partial ESM       | ⚠️ ESM support is improving but not perfect. Use `jest.config.mjs` and latest docs. |
| supertest               | ^7.1.1      | CJS               | ⚠️ CJS, but works with ESM via Node interop.                |
| nodemon                 | ^2.0.22     | CJS               | ⚠️ CJS, but works with ESM.                                 |
| vite (frontend)         | ^6.3.5      | **ESM**           | ✅ ESM support.                                             |

---

## Timeline & Milestones
1. **Preparation & Audit:** 1-2 days
2. **Initial Package & Config Changes:** 1 day
3. **Codebase Refactor:** 2-3 days
4. **Test Suite Refactor:** 1-2 days
5. **Validation & Cleanup:** 1 day
6. **Docs & Communication:** 1 day

**Estimated Total:** 1 week (for a medium-sized repo, adjust as needed)

---

## References
- [Node.js ESM Docs](https://nodejs.org/api/esm.html)
- [Jest ESM Guide](https://jestjs.io/docs/ecmascript-modules)
- [Langchain JS Docs](https://js.langchain.com/docs/)
- [Babel ESM Docs](https://babeljs.io/docs/en/babel-preset-env)

---

**This plan should be reviewed and customized for your repo’s specific needs.**
If you have any questions or run into blockers, document them in this file as you go.
