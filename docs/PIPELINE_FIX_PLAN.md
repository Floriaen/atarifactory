# Pipeline Fix Plan

## Current Issues

1. **PlannerAgent**
   - Returns empty plan array
   - Not properly handling game definition
   - ✅ Root cause: Not receiving full sharedState object

2. **StepFixerAgent**
   - Fails with "Cannot set properties of undefined (setting 'lastUpdate')"
   - Not properly handling metadata
   - ✅ Root cause: Not receiving full sharedState object

3. **FeedbackAgent**
   - Fails with "Cannot read properties of undefined (reading 'runtimePlayability')"
   - Not properly handling runtime results
   - ✅ Root cause: Not receiving full sharedState object

4. **BlockInserterAgent**
   - Fails to merge code properly
   - Not handling code blocks correctly
   - ✅ Root cause: Not receiving full sharedState object

5. **StaticCheckerAgent**
   - Reports syntax errors that aren't being fixed
   - Error reporting needs improvement
   - ✅ Root cause: Not receiving full sharedState object

## Root Cause

The controller is not properly following the agent contract where each agent should receive the full `sharedState` object. Instead, it's creating partial objects with only the fields it thinks each agent needs.

## Fix Plan

### 1. Controller Changes

- [x] Update all agent calls to pass the full `sharedState` object
- [x] Remove creation of partial objects for agent calls
- [x] Ensure `sharedState` is properly initialized with `createSharedState()`

### 2. Agent Contract Enforcement

- [x] Each agent should receive the full `sharedState` object
- [x] Agents should extract needed fields from `sharedState`
- [x] Agents should update `sharedState` with their results
- [x] Agents should handle undefined fields gracefully

### 3. Specific Agent Fixes

#### PlannerAgent
- [x] Ensure it properly handles `sharedState.gameDef`
- [x] Validate plan array before returning
- [x] Update `sharedState.plan` with generated plan

#### StepFixerAgent
- [x] Properly handle error list
- [x] Update `sharedState.stepCode` with fixed code

#### FeedbackAgent
- [ ] Add proper checks for `runtimePlayability`
- [ ] Handle missing runtime results gracefully
- [ ] Update `sharedState.feedback` with analysis

#### BlockInserterAgent
- [ ] Fix code merging logic
- [ ] Handle code block extraction properly
- [ ] Update `sharedState.currentCode` with merged code

#### StaticCheckerAgent
- [ ] Improve error reporting
- [ ] Add more detailed syntax error messages
- [ ] Update `sharedState.errorList` with validation results

### 4. Testing Plan

1. **Unit Tests**
   - [ ] Test each agent with full `sharedState`
   - [ ] Verify proper state updates
   - [ ] Check error handling
   - [ ] Validate code generation and merging

2. **Integration Tests**
   - [ ] Test full pipeline flow
   - [ ] Verify state consistency between agents
   - [ ] Check error recovery
   - [ ] Validate final game output

3. **Error Cases**
   - [ ] Test with missing fields
   - [ ] Test with invalid data
   - [ ] Test with syntax errors
   - [ ] Test with runtime errors

## Implementation Order

1. [x] Fix `sharedState` initialization in controller
2. [ ] Update agent contracts
3. [ ] Fix individual agents
4. [ ] Add tests
5. [ ] Verify pipeline flow 