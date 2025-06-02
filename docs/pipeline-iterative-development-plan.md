# Iterative Development Plan: Agent-Based Game Generation Pipeline

This plan describes how to incrementally build the new agent-based, LLM-driven game generation pipeline, following the system specification.

---

## Phase 1: Foundation & Scaffolding
1. **Set up a new directory or branch** for the new pipeline (e.g., `server/pipeline-v2/`).
2. **Copy or create utility modules** (file IO, logging, formatting, etc.).
3. **Scaffold the agent interface contracts** as per the spec (empty modules for each agent, with clear input/output signatures and docstrings).
4. **Write basic tests** for agent contract validation (input/output shape).
5. **Testing:** Unit tests for contract validation and utility functions.

---

## Phase 2: Core Pipeline Skeleton
6. **Implement the main orchestration controller**:
   - Reads a plan and steps through the agent sequence.
   - Handles agent calls, error catching, and logging.
   - No real logic yet—just pass-throughs and stubs.
7. **Add a minimal Express endpoint** to trigger the new pipeline and return a stubbed response.
8. **Testing:** Endpoint test and stubbed pipeline test (integration test for controller flow).

---

## Phase 3: Agent-by-Agent Implementation
9. **GameDesignAgent & PlannerAgent**:
   - Implement LLM-driven game design and plan generation.
   - Test: Can you get a valid plan from a title?
10. **StepBuilderAgent**:
    - Implement LLM-driven step code generation.
    - Test: Can you generate a code chunk for a step?
11. **BlockInserterAgent**:
    - Implement AST-based code merging (Recast/Babel).
    - Test: Can you insert/merge code into a function/file deterministically?
12. **StaticCheckerAgent**:
    - Implement static analysis (duplicate, undeclared, syntax).
    - Test: Can you catch and report static issues?
13. **StepFixerAgent**:
    - Implement LLM-driven code fixing for a step.
    - Test: Can you fix a code chunk based on error messages?
14. **SyntaxSanityAgent**:
    - Implement syntax validation (`new Function(code)`).
    - Test: Can you catch fatal syntax errors?
15. **RuntimePlayabilityAgent**:
    - Implement headless runtime validation (Puppeteer/jsdom).
    - Test: Can you detect if a game is playable?
16. **FeedbackAgent**:
    - Implement error routing and feedback logic.
    - Test: Can you route errors to the right agent and recover?
17. **Testing:** Unit tests for each agent with mock inputs/outputs; demo scripts for agent behavior.

---

## Phase 4: Orchestration Logic & Validation Loop
18. **Wire up the full step execution cycle**:
    - StepBuilderAgent → StaticCheckerAgent → StepFixerAgent → BlockInserterAgent → validation loop.
    - Ensure each step is validated and fixed before moving on.
19. **Integrate syntax and runtime validation** at the end of the plan.
20. **Implement error handling and recovery** as per the spec.
21. **Testing:** Integration tests for the full step cycle and validation loop.

---

## Phase 5: End-to-End Testing & Iteration
22. **Write end-to-end tests** for the full pipeline (from title to playable game).
23. **Test error cases and recovery** (static errors, runtime failures, etc.).
24. **Iterate on agent prompts, error handling, and code merging** based on test results.
25. **Testing:** End-to-end tests, error simulation, and regression tests.

---

## Phase 6: Integration & Migration
26. **Integrate with the frontend and existing endpoints** (swap in the new pipeline).
27. **Migrate or deprecate legacy code** as confidence in the new pipeline grows.
28. **Document the new pipeline** and update onboarding guides.
29. **Testing:** Manual/automated UI and API tests for integration.

---

## Phase 7: Advanced Features & Optimization
30. **Add caching, rollback, and history tracking**.
31. **Optimize for large codebases** (context summarization, chunking).
32. **Add support for new game genres, behaviors, or agent types**.
33. **Testing:** Regression and performance tests for advanced features.

---

## Summary Table

| Phase         | Deliverable/Goal                                 | Testing Approach                        |
|---------------|--------------------------------------------------|-----------------------------------------|
| 1. Foundation | Directory, agent stubs, utilities, contract tests| Unit tests for contracts                |
| 2. Skeleton   | Orchestration controller, endpoint, stubs        | Endpoint test, stubbed pipeline test    |
| 3. Agents     | Each agent implemented & tested in isolation     | Unit tests for each agent               |
| 4. Orchestration | Full step cycle, validation, error handling   | Integration tests for step cycle        |
| 5. E2E Tests  | End-to-end pipeline, error recovery              | End-to-end tests, error simulation      |
| 6. Integration| Frontend, migration, docs                        | Manual/automated UI and API tests       |
| 7. Advanced   | Caching, optimization, new features              | Regression and performance tests        |

---

**Tip:**
After each phase, demo the current state, gather feedback, and adjust the next steps as needed. This ensures you always have a working, testable system and can adapt to discoveries or changing requirements. 