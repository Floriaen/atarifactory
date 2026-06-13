# Unified Pipeline Progress Bar: Implementation Plan

## Objective
Implement a robust, unified progress bar for the game generation pipeline, where the backend/orchestrator is the sole authority for progress calculation, and the frontend acts as a pure consumer.

---

## 1. Backend Pipelines
- Each specialized pipeline (planning, coding, etc.) emits progress events as **local progress** (a float in the range 0.0–1.0) for its own phase.
- Pipelines must **not** attempt to emit global/unified progress or know their chunk weight.
- Only user-visible phases (chunks) should emit progress events.

## 2. Orchestrator
- The orchestrator is the **only** component responsible for global progress mapping.
- Listens to local progress events from each pipeline.
- Maps each pipeline’s local progress to the unified progress bar using the formula:
  ```js
  globalProgress = chunkStart + localProgress * chunkWeight;
  ```
  (where `chunkStart` and `chunkWeight` are determined by the orchestrator’s configuration, e.g., planning = 0–0.3, coding = 0.3–1.0).
- Emits unified progress events to the frontend with the payload:
  ```json
  {
    "progress": 0.0–1.0 // unified progress bar position (fraction)
  }
  ```
  > Only the `progress` field is sent to and used by the frontend. Any other fields (such as phase, localProgress, chunkWeight) are for backend debugging or analytics only and must not be used by the frontend.

- Only the orchestrator/backend computes and emits the unified progress value; the frontend must not compute or infer progress, but only display the value received from the backend.

## 3. Frontend
- Listens for unified progress events from the backend.
- Renders the progress bar below the "Tokens :" label.
- **Bar fill is computed directly from the `progress` value (0–1)** in the event payload.
- No step names, icons, or extra labels are shown in the bar.
- The bar is visually simple: no color changes, no animation, no icons.
- The frontend does not infer or calculate progress—**it only uses the value sent by the backend**.

## 4. Implementation Notes
- Backend should audit all pipeline phases and ensure only user-visible phases emit local progress events.
- Packaging and other non-LLM phases are included only if they emit progress events.
- Documentation, code, and tests must all reflect this unified, orchestrator-driven progress model.

---

## Step-by-Step Implementation Plan (with TDD)

1. **Create the ProgressionManager Module (TDD)**
   - Write unit tests for all expected behaviors and edge cases before implementing the module (red phase).
   - Implement `ProgressionManager.mjs` in `server/utils/` (green phase).
   - Refactor for clarity and maintainability as needed (refactor phase).
   - Validate phase weights at startup and in tests to prevent misconfiguration.
   - Ensure all tests pass and cover:
     - Phase registration and weight validation
     - Local to unified progress mapping
     - State reset before each pipeline run to avoid state leaks
     - Handling of skipped/optional phases and dynamic pipelines

2. **Integrate ProgressionManager into the Orchestrator (TDD)**
   - Write integration tests for orchestrator behavior with mocked pipelines and ProgressionManager.
   - Import and instantiate `ProgressionManager` in the orchestrator (e.g., `pipeline.mjs`).
   - When a sub-pipeline (e.g., planning, coding) emits a local progress update, the orchestrator listens for these updates and calls `progressionManager.updatePhaseProgress(phase, localProgress)`.
   - The orchestrator then emits the unified progress to the frontend via `{ progress }`.
   - Replace all ad-hoc progress mapping with calls to the module.
   - Refactor orchestrator code for clarity and testability.
   - Verify event wiring with integration tests to ensure no missed or duplicate progress updates.
   - Enforce that only the orchestrator emits unified progress (single source of truth).
   - Document and code review to prevent bypassing ProgressionManager.

3. **Update and Test the Frontend (TDD)**
   - Write/expand frontend tests to verify correct rendering from unified `progress` events (no local calculation).
   - Update the frontend to listen for unified progress events and use only the `progress` field.
   - Render the progress bar below the token count label, as specified.
   - Ensure tests verify no calculation/inference of progress in the UI.
   - Remove all legacy progress logic and contract violations from frontend code.

4. **Audit All Pipelines**
   - Review each pipeline phase to ensure it emits only local progress (0–1), never global/unified progress.
   - Ensure only user-visible phases emit progress events.
   - Add integration tests for skipped phases and error scenarios.

5. **End-to-End Testing**
   - Run the full pipeline and verify the progress bar moves smoothly from 0% to 100% for the entire process.
   - Check for regressions or edge cases (e.g., skipped phases, errors, restarts).
   - Add end-to-end tests for pipeline-to-frontend flow and contract adherence.

6. **Maintain Documentation**
   - Keep this plan and the main spec up-to-date with any changes to pipeline structure, progress logic, or event contracts.
   - Add comments and code linting to enforce contract boundaries and prevent frontend/backend contract drift.

2. **Integrate ProgressionManager into the Orchestrator (TDD)**
   - Write integration tests for orchestrator behavior with mocked pipelines and ProgressionManager.
   - Import and instantiate `ProgressionManager` in the orchestrator (e.g., `pipeline.mjs`).
   - When a sub-pipeline (e.g., planning, coding) emits a local progress update, the orchestrator listens for these updates and calls `progressionManager.updatePhaseProgress(phase, localProgress)`.
   - The orchestrator then emits the unified progress to the frontend via `{ progress }`.
   - Replace all ad-hoc progress mapping with calls to the module.
   - Refactor orchestrator code for clarity and testability.

3. **Update and Test the Frontend (TDD)**
   - Write/expand frontend tests to verify correct rendering from unified `progress` events (no local calculation).
   - Update the frontend to listen for unified progress events and use only the `progress` field.
   - Render the progress bar below the token count label, as specified.
   - Ensure tests verify no calculation/inference of progress in the UI.

4. **Audit All Pipelines**
   - Review each pipeline phase to ensure it emits only local progress (0–1), never global/unified progress.
   - Ensure only user-visible phases emit progress events.

5. **End-to-End Testing**
   - Run the full pipeline and verify the progress bar moves smoothly from 0% to 100% for the entire process.
   - Check for regressions or edge cases (e.g., skipped phases, errors, restarts).

6. **Maintain Documentation**
   - Keep this plan and the main spec up-to-date with any changes to pipeline structure, progress logic, or event contracts.

