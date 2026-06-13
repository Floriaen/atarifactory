# Chain Migration Plan

## Overview

This document outlines the migration strategy for remaining chains that use legacy LangChain construction patterns to the standardized `chainFactory.js` approach.

**Status:** 68% complete (13/19 chains migrated)

---

## Chains Requiring Migration

### 1. PlayabilityAutoFixChain.js
**Priority:** High
**Complexity:** Low
**Path:** `server/agents/chains/PlayabilityAutoFixChain.js`

**Current Implementation:**
```javascript
const autoFixPrompt = new PromptTemplate({
  template: promptString,
  inputVariables: ['gameDef', 'suggestion']
});
const parser = new JsonOutputParser();
return autoFixPrompt.pipe(llm).pipe(parser);
```

**Migration Strategy:**
- Replace with `createJSONChain()`
- Use appropriate Zod schema (may need to create one if not exists)
- Use `preset: 'structured'` or `preset: 'creative'` depending on needs
- Add `sharedState` parameter for token counting

**Target Implementation:**
```javascript
export async function createPlayabilityAutoFixChain(sharedState = {}) {
  return createJSONChain({
    chainName: 'PlayabilityAutoFixChain',
    promptFile: 'playability-autofix.txt',
    inputVariables: ['gameDef', 'suggestion'],
    schema: autoFixSchema, // Define in langchain-schemas.js if needed
    preset: 'structured',
    sharedState
  });
}
```

**Testing Requirements:**
- Ensure existing tests pass
- Verify JSON output structure unchanged
- Check error handling behavior

---

### 2. PlayabilityValidatorChain.js
**Priority:** High
**Complexity:** Low
**Path:** `server/agents/chains/PlayabilityValidatorChain.js`

**Current Implementation:**
```javascript
const playabilityPrompt = new PromptTemplate({
  template: promptString,
  inputVariables: ['mechanics', 'winCondition']
});
const structuredLLM = llm.withStructuredOutput(playabilityValidatorSchema);
return playabilityPrompt
  .pipe(structuredLLM)
  .withConfig({
    callbacks: [tokenCallback]
  });
```

**Migration Strategy:**
- Replace with `createValidationChain()` or `createStandardChain()`
- Schema already exists: `playabilityValidatorSchema`
- Use `preset: 'validation'`
- Token counting handled automatically via `sharedState`

**Target Implementation:**
```javascript
export async function createPlayabilityValidatorChain(sharedState = {}) {
  return createValidationChain({
    chainName: 'PlayabilityValidatorChain',
    promptFile: 'playability-validator.txt',
    inputVariables: ['mechanics', 'winCondition'],
    schema: playabilityValidatorSchema,
    sharedState
  });
}
```

**Testing Requirements:**
- Ensure existing tests pass
- Verify structured output with `playabilityValidatorSchema`
- Check token counting integration
- Verify callback behavior

---

### 3. PlannerChain.js
**Priority:** High
**Complexity:** Medium
**Path:** `server/agents/chains/PlannerChain.js`

**Current Implementation:**
```javascript
const plannerPrompt = new PromptTemplate({
  template: promptString,
  inputVariables: ['gameDefinition']
});
const structuredLLM = llm.withStructuredOutput(plannerSchema);
// Custom invoke wrapper for logging
const chain = {
  async invoke(input) {
    logger.debug('PlannerChain invoking', { input });
    const result = await baseChain.invoke(input);
    logger.debug('PlannerChain result', { result });
    return result;
  }
};
```

**Migration Strategy:**
- Replace with `createStandardChain()` or `createPlanningChain()`
- Schema already exists: `plannerSchema`
- Use `preset: 'planning'`
- Custom logging is now built into `createStandardChain()` via `enableLogging: true`
- For additional custom logic, use `customInvoke` parameter

**Target Implementation:**
```javascript
export async function createPlannerChain(sharedState = {}) {
  return createPlanningChain({
    chainName: 'PlannerChain',
    promptFile: 'planner.txt',
    inputVariables: ['gameDefinition'],
    schema: plannerSchema,
    sharedState,
    enableLogging: true // Built-in logging
  });
}
```

**Alternative (if custom logic needed):**
```javascript
export async function createPlannerChain(sharedState = {}) {
  return createPlanningChain({
    chainName: 'PlannerChain',
    promptFile: 'planner.txt',
    inputVariables: ['gameDefinition'],
    schema: plannerSchema,
    sharedState,
    customInvoke: async (input, baseChain, { chainName, enableLogging }) => {
      // Custom pre-processing
      logger.debug('Custom PlannerChain logic', { input });
      const result = await baseChain.invoke(input);
      // Custom post-processing
      return result;
    }
  });
}
```

**Testing Requirements:**
- Ensure existing tests pass
- Verify planning phase integration
- Check token counting works correctly
- Verify structured output with `plannerSchema`
- Test logging output matches expected format

---

## Migration Benefits

### Consistency
- All chains follow same factory pattern
- Uniform error handling across codebase
- Consistent configuration approach

### Maintainability
- Centralized prompt loading logic
- Single source of truth for chain configuration
- Easier to update LangChain dependencies

### Features
- Automatic token counting via `sharedState`
- Built-in tracing with `ENABLE_DEV_TRACE=1`
- Standardized logging
- Error handling via `handleChainError()`
- Input validation

### Code Quality
- Reduced boilerplate (30-40% less code per chain)
- Better testability
- Type-safe configuration via JSDoc

---

## Migration Checklist

For each chain migration:

- [ ] Read existing chain implementation
- [ ] Identify correct factory function (`createJSONChain`, `createValidationChain`, etc.)
- [ ] Verify schema exists in `langchain-schemas.js` (create if needed)
- [ ] Verify prompt file exists in `server/agents/prompts/`
- [ ] Replace manual construction with factory call
- [ ] Add `sharedState` parameter for token counting
- [ ] Run unit tests for specific chain
- [ ] Run integration tests
- [ ] Run full test suite (`npm test`)
- [ ] Verify behavior unchanged in manual testing
- [ ] Update any documentation referencing the chain
- [ ] Commit changes

---

## Testing Strategy

### Unit Tests
Each migrated chain should have corresponding tests in:
- `server/tests/unit/chains/`
- Verify basic invoke functionality
- Test error handling
- Check output structure

### Integration Tests
Verify chains work within pipelines:
- `server/tests/integration/design/` (for design chains)
- `server/tests/integration/planning/` (for planning chains)
- Test with realistic input data
- Verify pipeline integration

### Full Suite
Must pass all 52 tests:
```bash
npm test
```

### Manual Verification
```bash
# Test with mock pipeline
MOCK_PIPELINE=1 npm run start:server

# Test with real LLM (requires OPENAI_API_KEY)
npm run start:server
```

---

## Rollback Plan

If migration causes issues:

1. **Immediate Rollback**
   - Revert commit(s) via `git revert`
   - All chains are backwards compatible with existing code

2. **Gradual Rollback**
   - Keep factory implementation alongside legacy
   - Use feature flag to switch between implementations
   - Example:
     ```javascript
     export const USE_LEGACY_CHAIN = process.env.USE_LEGACY_PLANNER === '1';

     export async function createPlannerChain(sharedState = {}) {
       if (USE_LEGACY_CHAIN) {
         return createLegacyPlannerChain(sharedState);
       }
       return createStandardPlannerChain(sharedState);
     }
     ```

---

## Timeline Estimate

| Chain | Complexity | Estimated Time | Dependencies |
|-------|-----------|----------------|--------------|
| PlayabilityAutoFixChain | Low | 1-2 hours | Schema creation (if needed) |
| PlayabilityValidatorChain | Low | 1 hour | None (schema exists) |
| PlannerChain | Medium | 2-3 hours | Testing planning phase |

**Total Estimate:** 4-6 hours including testing

---

## Success Criteria

Migration is complete when:

- [ ] All 3 chains migrated to factory pattern
- [ ] All 52 tests passing
- [ ] No manual `new PromptTemplate()` in chain files
- [ ] No manual `llm.withStructuredOutput()` in chain files
- [ ] All chains support `sharedState` parameter
- [ ] Token counting works for all chains
- [ ] Documentation updated
- [ ] Code review approved

---

## References

- **Standard Template:** `server/utils/chainFactory.js`
- **Schemas:** `server/schemas/langchain-schemas.js`
- **Example Migrated Chain:** `server/agents/chains/design/EntityListBuilderChain.js`
- **Factory Documentation:** See JSDoc comments in `chainFactory.js`
- **Testing Guide:** `AGENT.md` (Testing section)

---

## Notes

- **DO NOT MODIFY:** `chainFactory.js`, `langchain-schemas.js`, `langchain.config.js` per AGENT.md
- All chains should maintain backwards compatibility
- Existing tests must continue to pass without modification
- Follow ESM module patterns (LangChain v0.3+)
- Use Winston logger for all logging
- Maintain consistent error handling patterns