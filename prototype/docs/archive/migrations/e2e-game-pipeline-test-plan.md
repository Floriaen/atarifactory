# E2E Game Specification Pipeline Test Plan

## Overview
This document describes the plan for implementing a robust end-to-end (E2E) test for the game specification creation pipeline. The goal is to ensure that the entire pipeline—from initial idea to validated, auto-fixed game definition—works as expected and can be invoked both from the main application and from automated tests.

## Steps to Achieve This

### 1. Dedicated Pipeline Function
- **Create a new, dedicated function (e.g., `runGameSpecPipeline`)** that encapsulates the full game specification pipeline logic.
- This function should:
  - Accept necessary inputs (e.g., title, logger, llmClient, etc).
  - Orchestrate all agent calls: GameInventorAgent → GameDesignAgent → PlayabilityValidatorAgent → PlayabilityAutoFixAgent (if needed) → PlannerAgent → etc.
  - Return a structured result (final gameDef, plan, logs, etc).
- **Export this function** so it can be called from both the real pipeline (controller.js) and from tests.

### 2. E2E Test Implementation
- **Write a new E2E test file** (e.g., `server/tests/e2e/GamePipeline.e2e.test.js`).
- In the test, call `runGameSpecPipeline` directly with a mock or real llmClient.
- The test should:
  - Provide a fixed seed or deterministic LLM mock for reproducibility.
  - Assert that the pipeline completes without error.
  - Assert that the returned gameDef is valid and playable.
  - Optionally, check that auto-fix is invoked and works as expected for unplayable designs.

### 3. Documentation and Usage
- **Document the new pipeline function and test approach in this file.**
- Explain how to invoke the pipeline from both production code and tests.
- Provide example usage and expected outputs.

## Benefits
- Enables true E2E validation of the full agent pipeline.
- Makes the pipeline logic reusable and testable in isolation.
- Facilitates regression testing and robust CI/CD integration.

---

## Next Steps
1. Refactor pipeline logic into a dedicated function (`runGameSpecPipeline`).
2. Export and document this function.
3. Write the E2E test.
4. Update this doc with implementation details and usage examples.

---

*Author: Cascade AI Assistant*
*Last updated: 2025-06-19*
