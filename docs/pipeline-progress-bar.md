# Pipeline Progress Bar: Specification and Integration

## Purpose
This document describes the requirements, backend/frontend responsibilities, and integration details for the simple pipeline progress bar that appears below the "Tokens :" label in the UI.

---

## 1. What Counts as a Phase?
- Only pipeline phases ("chunks") that emit a local progress event (fraction 0–1) are included in the unified progress bar.
- Examples: Planning, Coding, Packaging, etc. (if they emit progress events).
- Only phases that are user-visible and meaningful for progress should be included.
- Ignore any internal or backend-only phases that do not emit progress events.

---

## 2. Backend Responsibilities
- Each specialized pipeline (e.g., planning, coding) emits progress events as **local progress** in the range 0.0–1.0 (or 0–100%). Pipelines do not need to know their global weight or position in the unified process.
- The **orchestrator** is responsible for:
  - Knowing the global progress weights for each pipeline (e.g., planning = 30%, coding = 70%).
  - Listening to local progress events from each pipeline.
  - Mapping each pipeline's local progress to the correct global progress chunk, using the formula:
    ```js
    globalProgress = chunkStart + localProgress * chunkWeight;
    ```
    For example, if planning is 0–0.3 and localProgress = 0.5, then globalProgress = 0.15 (15%).
  - Emitting unified progress events to the frontend with the following payload:
    ```json
    {
      "progress": 0.0–1.0, // unified progress bar position (fraction)
      "phase": "planning" | "coding" | ...,
      "localProgress": 0.0–1.0, // progress within current pipeline
      "chunkWeight": 0.3 // (optional) weight of current pipeline
    }
    ```
- The backend/orchestrator is the single source of truth for unified progress.
- Do **not** emit "Done" or "Error" as progress steps—these are end states, not progress.

---

## 3. Frontend Responsibilities
- The frontend listens for backend progress events (emitted by the orchestrator).
- The progress bar is rendered below the "Tokens :" label.
- The bar fill is computed directly from the `progress` value (a fraction 0–1) in the event payload.
- No step names, icons, or extra labels are shown in the bar (the existing step label UI remains unchanged).
- The bar is visually simple: no color changes, no animation, no icons.

---

## 4. Implementation Notes
- The backend should audit all pipeline phases (chunks) and ensure each emits local progress events (fraction 0–1) if they are user-visible.
- Packaging and other non-LLM phases should be included if they are part of the user-visible process and emit progress.
- The frontend should not try to infer progress—only use the unified progress value sent by the backend/orchestrator.

---

## Example Backend Event
```json
{
  "progress": 0.42
}
```
> Only the `progress` field is sent to and used by the frontend. Any other fields (such as phase, localProgress, chunkWeight) are for backend debugging or analytics only and must not be used by the frontend.

---

## Example UI (Sketch)
```
Tokens : 123
[██████████████░░░░░░░░░░░░░░░░░░░░░░]   (simple, no extra labels)
```

---

## Action Items for Devs
- **Backend Pipelines:**
  - Each pipeline (planning, coding, etc.) should emit progress events as local progress (0.0–1.0) only.
  - Pipelines must NOT attempt to emit global/unified progress or know their chunk weight.
- **Orchestrator:**
  - Listen to local progress events from each pipeline.
  - Map local progress to unified progress using chunk weights and emit unified progress events as shown above.
  - Only the orchestrator knows the weights and is responsible for the unified progress contract.
- **Frontend:**
  - Use only the unified `progress` value sent by the orchestrator/backend to render the progress bar.
  - Do not infer or calculate progress locally; do not display extra UI elements on the bar unless specified by backend events.

---

_Last updated: 2025-06-25_
