# Pipeline Event System

## Overview

This document defines the canonical event-driven contract between the backend (pipelines, orchestrator) and frontend for all game generation and progress reporting. It ensures clarity, modularity, and scalability for all event-based communication in the pipeline.

All events are sent as JSON objects over the event stream (SSE or similar). Each event type has a strict, minimal schema and documented purpose.

---

## Canonical Event Types

### 1. `PipelineStatus` (Unified Event)
- **Purpose:** Notify progress, phase/step transitions, token usage, and status updates in a single, canonical event.
- **Emitted by:** Pipelines and orchestrator (all pipeline progress/status updates)
- **Payload:**
  ```json
  {
    "type": "PipelineStatus",
    "phase": {                      // object: phase info
      "name": "ContextStepBuilder",   // canonical phase name
      "label": "Coding",              // user-friendly phase label
      "description": "Add player orb"  // dynamic: may change multiple times within the same phase to reflect the current activity or step
    },
    "progress": 0.42,               // number, 0.0–1.0 (rounded to 2 decimals)
    "tokenCount": 374,              // number: cumulative token count (always present)
    "timestamp": "2025-06-27T08:00:01.000Z"
  }
  ```
- **Notes:**
  - All phase-related information, including the canonical name, user-friendly label, and current activity/step, is included in the `phase` object.
  - `phase.description` may change multiple times within a phase to reflect the current activity or step.
  - The event is minimal and always includes the latest `progress` and `tokenCount`.

### 2. `Error`
- **Purpose:** Report errors in any pipeline phase for robust UI and logging.
- **Emitted by:** Any layer (pipeline, orchestrator, controller)
- **Payload:**
  ```json
  {
    "type": "Error",
    "message": "Failed to generate code.",
    "phase": "ContextStepBuilder", // optional: canonical phase name where error occurred
    "details": {},                // optional: error details, stack trace, etc.
    "timestamp": "2025-06-27T08:00:03.000Z"
  }
  ```

### 3. `Result`
- **Purpose:** Deliver the final output (e.g., summary, completion message).
- **Emitted by:** Orchestrator or pipeline at completion.
- **Payload:**
  ```json
  {
    "type": "Result",
    "summary": "Game generated successfully.",
    "timestamp": "2025-06-27T08:00:04.000Z"
  }
  ```

---

## Emission and Handling Contract

- **Pipelines** emit only local events (`PhaseStatus`, `TokenCount`).
- **Orchestrator** listens to all events, computes and emits unified `Progress` events, and emits the final `Result`.
- **No event** should ever send the entire SharedState or large code blobs except for the final `Result`.
- **All events** must include a `timestamp` in ISO 8601 format for traceability.

---

## Extensibility

- To add a new event type, update this document and the shared type declaration module (`server/types/PipelineEventTypes.js`).
- Payloads should remain backward compatible; add new optional fields as needed.
- Document any new event type or field here.

---


## See Also
- `docs/pipeline-progress-bar.md` — for progress bar UI and backend/frontend contract (references this document)
- `server/types/PipelineEventTypes.js` — canonical event type declarations
