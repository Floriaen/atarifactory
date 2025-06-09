# Refactoring Plan: Shared Context Object for Agents

## Overview

This document outlines the plan to refactor the agent-based pipeline to use a shared context object. The refactoring will be done in two phases:
1. First, follow `testing-strategy.md` to set up the test structure, skipping tests that depend on the refactoring (because mocks need to know the step to return the right answer).
2. Then, implement the refactoring using TDD (Test-Driven Development), starting by updating the existing tests.

## Phase 1: Test Structure Setup

1. **Follow Testing Strategy**
   - Implement tests as per `testing-strategy.md`
   - Focus on tests that don't depend on step context (e.g., basic agent functionality)

2. **Identify and Skip Dependent Tests**
   - Mark tests that need step context with `it.skip`
   - Add TODO comments explaining why they're skipped
   - Example:
     ```js
     // TODO: Re-enable after context refactoring. Mock needs step context to return correct response.
     it.skip('should maintain state between steps in the chain', async () => {
       // ... test code ...
     });
     ```

## Phase 2: TDD Refactoring

1. **Update Tests First (TDD)**
   - Re-enable skipped tests
   - Update them to use the new context object
   - Tests will fail (as expected in TDD)
   - Example:
     ```js
     it('should maintain state between steps in the chain', async () => {
       const context = {
         plan,
         currentStep: plan[0],
         currentCode: ''
       };
       const firstStepCode = await StepBuilderAgent(context, options);
       context.currentStep = plan[1];
       context.currentCode = firstStepCode;
       const secondStepCode = await StepBuilderAgent(context, options);
       // ... assertions ...
     });
     ```

2. **Create Context Object Structure**
   - Define the `context` object interface
   - Include all necessary fields:
     - `plan` (the full list of steps)
     - `currentStep` (the step being processed)
     - `currentCode` (the code generated so far)
     - Any other shared state (e.g., logs, errors)

3. **Update Agent Function Signatures**
   - Change all agent functions to accept a `context` object as their first argument
   - Example:
     ```js
     // Before
     async function StepBuilderAgent(currentCode, plan, step, options) { ... }
     // After
     async function StepBuilderAgent(context, options) { ... }
     ```

4. **Update Agent Implementations**
   - Change all references from individual parameters to properties on the `context` object
   - Example:
     ```js
     // Before
     const { currentCode, plan, step } = ...;
     // After
     const { currentCode, plan, currentStep } = context;
     ```

5. **Update Pipeline Orchestration**
   - Wherever agents are called, build and pass the `context` object instead of individual arguments
   - Example:
     ```js
     const context = { plan, currentStep, currentCode };
     await StepBuilderAgent(context, options);
     ```

6. **Update Mock Implementations**
   - Update mocks to use the context object
   - Ensure they can access the current step to return the correct response
   - Example:
     ```js
     // Before
     if (prompt.includes('Setup canvas and loop')) { ... }
     // After
     if (context.currentStep.label === 'Setup canvas and loop') { ... }
     ```

7. **Document the New Pattern**
   - Update documentation to reflect the new pattern
   - Add examples of how to use the `context` object in tests and agent implementations

## Timeline

- **Phase 1:** Test structure setup (1-2 days)
- **Phase 2:** TDD refactoring (2-3 days)

## Risks and Mitigations

- **Risk:** Breaking changes if not all agents are updated
  - **Mitigation:** Incremental refactoring, one agent at a time, with tests after each change
- **Risk:** Increased verbosity in agent calls
  - **Mitigation:** The clarity and maintainability benefits outweigh the verbosity

## Conclusion

This refactoring will significantly improve the modularity and testability of the agent-based pipeline. By ensuring all agents receive the same context, we reduce the risk of bugs and make the system easier to extend and maintain.

## Note

This refactoring plan assumes that the test structure is already in place as per `testing-strategy.md`. The refactoring will be implemented after all tests are written and passing with the current implementation. 