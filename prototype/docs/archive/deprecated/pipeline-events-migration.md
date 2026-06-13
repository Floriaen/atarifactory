# Pipeline Event System Refactoring Plan & Migration Notes

This document outlines the migration plan for refactoring the pipeline event system to use the new canonical event types, as defined in `pipeline-events.md`.

---

## Migration Notes

- Legacy event types (`CodingPipeline`, `PlanningStep`, etc.) are deprecated and should be replaced by the canonical types described in `pipeline-events.md`.
- Frontend and backend must be updated to use only these event types and payloads.
- The progress bar is now driven exclusively by the `progress` field in the `PipelineStatus` event.

## Migration Steps

1. **Testing First (TDD)**
    - Write or update integration and unit tests for both backend and frontend:
        - Expect only canonical events (`PipelineStatus`, `Error`, `Result`) in all pipeline and orchestrator outputs. Refer to [`docs/pipeline-events.md`](./pipeline-events.md) for the canonical schemas.
        - Assert that `PipelineStatus` events include the correct schema (`type`, `phase`, `progress`, `tokenCount`, `timestamp`).
        - Ensure the progress bar is updated from the `progress` field in `PipelineStatus` only.
        - Remove or fail on any legacy event types or non-canonical payloads.
        - **Cover error and edge cases:** malformed events, missing fields, error propagation, and recovery scenarios.
    - For the frontend:
        - Update tests to expect only canonical event types.
        - Assert that UI components (progress bar, token count, phase display) update exclusively from `PipelineStatus` events.
        - Ensure no UI updates occur from legacy or partial event payloads.

2. **Backend Refactor**
    - Remove emission of all legacy event types.
    - Update pipelines and orchestrator to emit only `PipelineStatus`, `Error`, and `Result` events.
    - Ensure all event payloads match the canonical schemas.
    - The orchestrator must emit unified `PipelineStatus` events with the correct `progress` value (0–1), mapping local progress from sub-pipelines as needed.
    - Sub-pipelines emit only local progress; orchestrator computes unified progress.

3. **Frontend Refactor**
    - Update event stream handlers to consume only the new canonical event types.
    - Remove logic for legacy event types.
    - Ensure UI components (progress bar, status display, etc.) use the new event payloads.
    - The progress bar must be updated exclusively from the `progress` field in `PipelineStatus` events—no inference or calculation from step indices or legacy events.
    - Use `tokenCount` and `phase` from `PipelineStatus` for UI display as needed.

4. **Validation & Final Testing**
    - Run all updated tests to confirm migration success.
    - **Manual QA:**
        - Verify that the progress bar updates live and accurately from backend events.
        - Confirm token count and phase label/description update as expected.
        - Simulate and check error event display and result summary rendering.
    - (Optional) Consider feature flagging or a roll-back plan if migration needs to be staged or reverted.

---

## Risks & Mitigation Checklist

| Risk Category              | What Could Go Wrong                                                                 | Mitigation Strategy                                                      |
|---------------------------|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| Partial Migration         | Legacy event types or handlers remain, causing mixed contracts or UI breakage.      | Remove all legacy code; use tests to fail on any non-canonical event.    |
| Schema Drift/Inconsistency| Backend emits events not matching canonical schema; frontend expects old fields.    | Strict schema validation in tests; contract tests for all event shapes.  |
| Test Coverage Gaps        | Tests miss edge cases (malformed events, missing fields, error propagation).        | Write comprehensive unit/integration tests for all canonical events.     |
| Progress Bar/Token Bugs   | Progress bar or token count doesn't update live; UI listens to wrong events.        | Assert UI updates only from PipelineStatus; remove legacy event logic.   |
| Error Handling Regression | Errors not surfaced or displayed due to contract mismatch.                         | Test error event emission/consumption; ensure UI displays error events.  |
| Orchestrator Mapping Bugs | Orchestrator maps local to global progress incorrectly; sub-pipelines emit global.  | Test unified progress logic; ensure only orchestrator emits global prog. |
| Documentation Drift       | Docs not updated with code, causing confusion.                                      | Update docs in sync with code changes; code review for doc/code match.   |

---

Refer to [`docs/pipeline-events.md`](./pipeline-events.md) for the canonical event schemas and detailed field documentation.
Refer to [`docs/pipeline-progress-bar.md`](./pipeline-progress-bar.md) for frontend/backend progress bar integration guidance.
