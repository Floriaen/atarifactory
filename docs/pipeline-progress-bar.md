# Pipeline Progress Bar: Specification and Integration

## Purpose
This document describes the requirements, backend/frontend responsibilities, and integration details for the simple pipeline progress bar that appears below the "Tokens :" label in the UI.

---

## 1. What Counts as a Step?
- Each pipeline phase that emits a progress/status event (e.g., via `onStatusUpdate`) is considered a "step".
- Examples of steps: Idea Generation, Validation, Auto-Fix, Static Checking, Feedback, Packaging, etc.
- **Packaging** (saving files, updating manifests, etc.) is a step only if it emits a progress event.
- Only steps that are user-visible and meaningful for progress should be included.

---

## 2. Backend Responsibilities
- The backend must emit a progress event at each step, with the following payload:
  ```json
  {
    "currentStep": N,
    "totalSteps": M
  }
  ```
- The backend determines which phases/steps are included (including packaging if relevant).
- Do **not** include "Done" or "Error" as steps—these are end states, not progress steps.
- The backend is the single source of truth for both `currentStep` and `totalSteps`.

---

## 3. Frontend Responsibilities
- The frontend listens for backend progress events.
- The progress bar is rendered below the "Tokens :" label.
- The bar fill is computed as `currentStep / totalSteps`.
- No step names, icons, or extra labels are shown in the bar (the existing step label UI remains unchanged).
- The bar is visually simple: no color changes, no animation, no icons.

---

## 4. Implementation Notes
- The backend should audit all phases/steps in the pipeline and ensure each emits a progress event with a step index.
- Packaging and other non-LLM steps should be included if they are part of the user-visible process.
- The frontend should not try to infer step count or progress—only use the values sent by the backend.

---

## Example Backend Event
```js
onStatusUpdate('PipelineProgress', {
  currentStep: 5,
  totalSteps: 7
});
```

---

## Example UI (Sketch)
```
Tokens : 123
[██████████████░░░░░░░░░░░░░░░░░░░░░░]   (simple, no extra labels)
```

---

## Action Items for Devs
- **Backend:**
  - Review all phases/steps in the pipeline.
  - Ensure each emits a progress event with a step index and total.
  - Include packaging and any other non-LLM steps if they are part of the user-visible process.
- **Frontend:**
  - Use only the values sent by the backend to render the progress bar.
  - Do not add extra UI elements to the bar.

---

_Last updated: 2025-06-25_
