# Refactoring Plan: Shared State for Agents

## Overview

This document outlines the plan to refactor the agent-based pipeline to use shared state. The refactoring will be done in two phases:
1. First, follow `testing-strategy.md` to set up the test structure, skipping tests that depend on the refactoring (because mocks need to know the step to return the right answer).
2. Then, implement the refactoring using TDD (Test-Driven Development), starting by updating the existing tests.

## Phase 1: Test Structure Setup (Completed)

1. **Test Structure**
   - Tests are implemented as per `testing-strategy.md`
   - Focus on tests that don't depend on step context (e.g., basic agent functionality)
   - Tests that need step context are marked with `it.skip`
   - TODO comments explain why they're skipped
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
   - Update them to use the new shared state structure
   - Tests will fail (as expected in TDD)
   - Example:
     ```js
     it('should maintain state between steps in the chain', async () => {
       const sharedState = {
         gameDef,
         errors: [],
         currentStep: plan[0]
       };
       const firstStepCode = await StepBuilderAgent(
         { 
           currentCode: '',
           plan,
           step: plan[0],
           sharedState
         }, 
         { logger, traceId, llmClient }
       );
       sharedState.currentStep = plan[1];
       const secondStepCode = await StepBuilderAgent(
         { 
           currentCode: firstStepCode,
           plan,
           step: plan[1],
           sharedState
         }, 
         { logger, traceId, llmClient }
       );
       // ... assertions ...
     });
     ```

2. **Create Shared State Structure**
   - Define the `SharedState` type/interface:
     ```typescript
     interface SharedState {
       // Game definition and planning
       gameDef: GameDefinition | null;
       plan: Step[];
       currentStep: Step | null;
       
       // Code generation and validation
       currentCode: string;
       errors: Error[];
       
       // Runtime state
       runtimeResults?: {
         playabilityScore?: number;
         feedback?: string;
         // ... other runtime metrics
       };
       
       // Metadata
       metadata?: {
         startTime?: Date;
         lastUpdate?: Date;
         // ... other metadata
       };
     }
     ```
   - Create a factory function to initialize shared state:
     ```typescript
     function createSharedState(): SharedState {
       return {
         gameDef: null,
         plan: [],
         currentStep: null,
         currentCode: '',
         errors: [],
         runtimeResults: {},
         metadata: {
           startTime: new Date(),
           lastUpdate: new Date()
         }
       };
     }
     ```

3. **Update Agent Function Signatures**
   - Keep the current pattern of separating input parameters from dependencies
   - Move all state into the sharedState object
   - Example:
     ```typescript
     // Before
     async function StepBuilderAgent({ currentCode, plan, step }, { logger, traceId, llmClient }) { ... }
     
     // After
     async function StepBuilderAgent({ sharedState }: { sharedState: SharedState }, { logger, traceId, llmClient }) { ... }
     ```

4. **Update Agent Implementations**
   - Change all references to use the shared state object
   - Example:
     ```typescript
     // Before
     const { currentCode, plan, step } = ...;
     
     // After
     const { currentCode, plan, currentStep, gameDef, errors } = sharedState;
     // Use sharedState.gameDef, sharedState.errors, etc.
     ```

5. **Update Pipeline Orchestration**
   - Modify `runPipeline` in `controller.js` to maintain shared state
   - Pass the shared state to each agent in the chain
   - Example:
     ```typescript
     const sharedState = createSharedState();
     
     // GameDesignAgent
     const gameDef = await GameDesignAgent(
       { sharedState },
       { logger, traceId, llmClient }
     );
     sharedState.gameDef = gameDef;
     
     // PlannerAgent
     const plan = await PlannerAgent(
       { sharedState },
       { logger, traceId, llmClient }
     );
     sharedState.plan = plan;
     
     // Step execution
     for (const step of sharedState.plan) {
       sharedState.currentStep = step;
       // ... rest of the step execution
     }
     ```

6. **Update Mock Implementations**
   - Update mocks to use the shared state
   - Ensure they can access the current step and other shared state
   - Example:
     ```js
     // Before
     if (prompt.includes('Setup canvas and loop')) { ... }
     
     // After
     if (context.sharedState.currentStep.label === 'Setup canvas and loop') { ... }
     ```

7. **Document the New Pattern**
   - Update documentation to reflect the new pattern
   - Add examples of how to use the shared state in tests and agent implementations
   - Document the benefits of the new pattern:
     - Better state management between agents
     - Easier testing with predictable state
     - Clearer agent dependencies
     - More maintainable code

## Timeline

- **Phase 1:** Completed
- **Phase 2:** 2-3 days
  - Day 1: Update tests and agent signatures
  - Day 2: Implement shared state and update pipeline
  - Day 3: Update mocks and documentation

## Risks and Mitigations

- **Risk:** Breaking changes if not all agents are updated
  - **Mitigation:** Incremental refactoring, one agent at a time, with tests after each change
- **Risk:** Increased complexity in agent signatures
  - **Mitigation:** The benefits of shared state outweigh the added complexity
- **Risk:** State synchronization issues
  - **Mitigation:** Clear documentation and type definitions for shared state

## Conclusion

This refactoring will significantly improve the modularity and testability of the agent-based pipeline. By ensuring all agents have access to the same shared state, we reduce the risk of bugs and make the system easier to extend and maintain.

## Note

This refactoring plan builds upon the existing patterns in the codebase rather than replacing them entirely. The goal is to enhance the current implementation with better state management while maintaining backward compatibility.

## Implementation Steps

### Phase 1: Setup and Initial Structure (Day 1)
1. Create the `SharedState` type definition
2. Create the `createSharedState` factory function
3. Add unit tests for the factory function
4. Create a new branch for the refactoring

### Phase 2: Gradual Agent Updates (Days 2-4)
1. Start with GameDesignAgent:
   - Update function signature to accept sharedState
   - Keep existing parameters temporarily
   - Add sharedState to the input
   - Update tests
   - Verify functionality

2. Update PlannerAgent:
   - Update function signature
   - Move plan into sharedState
   - Update tests
   - Verify functionality

3. Update StepBuilderAgent:
   - Update function signature
   - Move currentCode and step into sharedState
   - Update tests
   - Verify functionality

4. Update remaining agents one by one:
   - SyntaxSanityAgent
   - RuntimePlayabilityAgent
   - FeedbackAgent
   - BlockInserterAgent
   - Each agent should be updated and tested independently

### Phase 3: Pipeline Updates (Day 5)
1. Update the pipeline orchestration:
   - Initialize sharedState at the start
   - Pass it through the chain
   - Keep existing functionality working
   - Add tests for state management

### Phase 4: Cleanup and Optimization (Day 6)
1. Remove deprecated parameters
2. Update documentation
3. Add final tests
4. Create pull request

## Testing Strategy
- Each agent update should be tested independently
- Maintain existing test coverage
- Add new tests for shared state functionality
- Verify state persistence between agents
- Test error handling and edge cases

## Rollback Plan
- Keep the old parameter structure until all agents are updated
- Maintain backward compatibility during the transition
- Have a rollback commit ready for each phase
- Test rollback procedures

## Success Criteria
- All tests passing
- No regression in functionality
- Improved code organization
- Better state management
- Maintained or improved performance

## Note

This refactoring plan builds upon the existing patterns in the codebase rather than replacing them entirely. The goal is to enhance the current implementation with better state management while maintaining backward compatibility. 