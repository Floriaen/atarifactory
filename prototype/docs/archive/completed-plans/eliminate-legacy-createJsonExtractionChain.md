# Migration Plan: Eliminate Legacy createJsonExtractionChain

## Overview
This document outlines the systematic plan to completely remove the deprecated `createJsonExtractionChain` function and migrate all remaining chains to use the modern `chainFactory.js` utilities.

## Current State Analysis

### Files Using Legacy Function (7 chains):
1. `server/agents/chains/design/FinalAssemblerChain.js`
2. `server/agents/chains/design/IdeaGeneratorChain.js`
3. `server/agents/chains/design/LoopClarifierChain.js`
4. `server/agents/chains/design/MechanicExtractorChain.js`
5. `server/agents/chains/design/WinConditionBuilderChain.js`
6. `server/agents/chains/design/EntityListBuilderChain.js`
7. `server/agents/chains/design/PlayabilityHeuristicChain.js`

### Already Modernized (3 chains):
- ✅ `GameInventorChain` - Using `createCreativeChain`
- ✅ `FeedbackChain` - Using `createJSONChain`
- ✅ `PlannerChain` - Using structured output directly
- ✅ `PlayabilityValidatorChain` - Using structured output directly

## Migration Strategy

### Phase 1: Prepare Schemas
**Duration:** 30 minutes
**Goal:** Ensure all remaining chains have Zod schemas defined

**Actions:**
1. Review existing schemas in `server/schemas/langchain-schemas.js`
2. Add missing schemas for remaining chains
3. Test schema validation with sample data

**Schemas to verify/add:**
- `ideaGeneratorSchema` ✅ (already exists)
- `mechanicExtractorSchema` ✅ (already exists)
- `entityListBuilderSchema` ✅ (already exists)
- `winConditionBuilderSchema` ✅ (already exists)
- `loopClarifierSchema` ✅ (already exists)
- `playabilityHeuristicSchema` ✅ (already exists)
- `finalAssemblerSchema` ✅ (already exists)

### Phase 2: Migrate Chains One by One
**Duration:** 2-3 hours
**Goal:** Convert each chain to use modern factory patterns

#### Migration Template:
```javascript
// BEFORE (legacy pattern):
import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.js';

function createXxxChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['var1', 'var2'],
    schemaName: 'description',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

// AFTER (modern pattern):
import { createJSONChain } from '../../../utils/chainFactory.js';
import { xxxSchema } from '../../../schemas/langchain-schemas.js';

async function createXxxChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'XxxChain',
    promptFile: 'design/YourChain.prompt.md',
    inputVariables: ['var1', 'var2'],
    schema: xxxSchema,
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}
```

#### Chain-by-Chain Migration Order:

**1. IdeaGeneratorChain** (Simplest)
- Uses: `ideaGeneratorSchema`
- Input variables: `['constraints']`
- Preset: `creative`

**2. MechanicExtractorChain**
- Uses: `mechanicExtractorSchema`
- Input variables: `['gameConcept']`
- Preset: `structured`

**3. EntityListBuilderChain**
- Uses: `entityListBuilderSchema`  
- Input variables: `['gameConcept']`
- Preset: `structured`

**4. WinConditionBuilderChain**
- Uses: `winConditionBuilderSchema`
- Input variables: `['gameConcept']`
- Preset: `structured`

**5. LoopClarifierChain**
- Uses: `loopClarifierSchema`
- Input variables: `['gameConcept']`
- Preset: `structured`

**6. PlayabilityHeuristicChain**
- Uses: `playabilityHeuristicSchema`
- Input variables: `['gameDefinition']`
- Preset: `validation`

**7. FinalAssemblerChain** (Most complex)
- Uses: `finalAssemblerSchema`
- Input variables: `['title', 'pitch', 'loop', 'mechanics', 'winCondition', 'entities']`
- Preset: `structured`

### Phase 3: Update Tests
**Duration:** 1 hour
**Goal:** Ensure all tests pass with modernized chains

**Actions:**
1. Run unit tests for each migrated chain
2. Update any test expectations if needed
3. Verify integration tests still pass
4. Check that token counting works correctly

### Phase 4: Remove Legacy Code
**Duration:** 30 minutes
**Goal:** Clean up deprecated code

**Actions:**
1. Delete `server/utils/createJsonExtractionChain.js`
2. Remove any unused imports
3. Update documentation
4. Final test run

## Risk Assessment

### Low Risk:
- Schema validation (adds safety)
- Token counting changes (optional feature)
- Error handling improvements

### Medium Risk:
- Async function changes (from sync to async)
- Import path changes
- Different return patterns

### High Risk:
- Breaking changes to chain APIs
- Test failures due to behavior changes

## Validation Checklist

### For Each Migrated Chain:
- [ ] Unit tests pass
- [ ] Integration tests pass  
- [ ] Schema validation works
- [ ] Token counting functions
- [ ] Error handling improved
- [ ] Logging works correctly
- [ ] Backward compatibility maintained

### Final Validation:
- [ ] All 77 tests still pass
- [ ] No remaining references to `createJsonExtractionChain`
- [ ] ESLint passes with no errors
- [ ] Performance not degraded
- [ ] Documentation updated

## Rollback Plan

### If Issues Occur:
1. **Immediate:** Revert specific chain causing problems
2. **Testing:** Run affected tests to verify rollback
3. **Analysis:** Identify root cause before retry

### Rollback Triggers:
- Test failure rate > 10%
- Breaking changes to existing APIs
- Performance degradation > 20%

## Success Metrics

### Code Quality:
- [ ] Zero usage of deprecated `createJsonExtractionChain`
- [ ] All chains use consistent modern patterns
- [ ] Centralized configuration utilized

### Functionality:
- [ ] All tests passing (77/77)
- [ ] Token counting accurate across all chains
- [ ] Schema validation prevents errors

### Developer Experience:
- [ ] Consistent API patterns
- [ ] Better error messages
- [ ] Enhanced logging and debugging

## Timeline

**Total Estimated Time:** 4-5 hours

**Week 1:**
- **Day 1:** Phase 1 (Schema preparation) - 30 min
- **Day 2:** Phase 2a (Migrate chains 1-4) - 1.5 hours  
- **Day 3:** Phase 2b (Migrate chains 5-7) - 1.5 hours

**Week 2:**
- **Day 1:** Phase 3 (Update tests) - 1 hour
- **Day 2:** Phase 4 (Remove legacy code) - 30 min

## Next Steps

1. **Review this plan** with the team
2. **Prioritize chains** based on usage frequency
3. **Start with Phase 1** (schema preparation)
4. **Execute migration** chain by chain
5. **Document learnings** for future migrations

---

**Created:** 2025-07-11  
**Status:** Planning  
**Next Action:** Begin Phase 1 - Schema verification  
**Owner:** Claude Code Assistant
