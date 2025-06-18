# Development Plan: GameInventorAgent & Pipeline Rework

## Overview
This plan describes the steps to introduce a new `GameInventorAgent` as the creative originator in the game generation pipeline, and to rework the `GameDesignAgent` and pipeline orchestration accordingly. The first step will focus on adding and reworking tests to ensure reliability and facilitate safe refactoring.

---

## Step 1: Add and Rework Tests
# Development Plan: GameInventorAgent & Pipeline Rework

## Overview
This plan describes the steps to introduce a new `GameInventorAgent` as the creative originator in the game generation pipeline, and to rework the `GameDesignAgent` and pipeline orchestration accordingly. The first step focused on adding and reworking tests to ensure reliability and facilitate safe refactoring.

---

## ✅ Step 1: Add and Rework Tests
- [x] Audit existing tests for GameDesignAgent and pipeline orchestration.
- [x] Add tests for the new GameInventorAgent:
    - Should generate a unique name and creative description given a theme or no input.
    - Should handle edge cases (empty, nonsense, or repeated input).
- [x] Update integration tests:
    - Ensure pipeline calls GameInventorAgent first and passes results to GameDesignAgent.
    - Validate that the full pipeline produces varied and consistent outputs.
- [x] Add/Update mocks for LLM client as needed.

## ✅ Step 2: Implement GameInventorAgent
- [x] Create `server/agents/GameInventorAgent.js`.
- [x] Write prompt template in `server/agents/prompts/GameInventorAgent.prompt.md`.
- [x] Implement agent logic to output `name` and `description`.

## ✅ Step 3: Rework GameDesignAgent
- [x] Update input to accept `name` and `description` (not just title).
- [x] Update prompt template to use new fields.
- [x] Refactor agent logic and tests accordingly.

## ✅ Step 4: Update Pipeline Orchestration
- [x] Modify pipeline to call GameInventorAgent first.
- [x] Pass its output to GameDesignAgent.
- [x] Update shared state and status events as needed.

## ⏳ Step 5: Frontend and UI (Optional)
- [ ] Display invented name and description in the UI before game design details.

## ✅ Step 6: Documentation & Review
- [x] Update architecture and agent documentation.
- [x] Review and refactor code for clarity and maintainability.
- [x] Final test sweep and CI validation.

---

### Summary
- The pipeline now starts with a creative invention step, and the invented name/description are used throughout.
- All backend, agent, and test work is complete and documented.
- Only the optional UI update remains: displaying the invented name and description to the user before game design details.

*Last updated: 2025-06-18*

