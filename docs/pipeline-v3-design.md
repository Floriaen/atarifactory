# Pipeline-v3 – Context-Incremental Strategy

> Draft ‑ work-in-progress design document.  
> Please review and refine before implementation.

---

## 1 · Motivation
* The AST-merge strategy (pipeline-v2) introduces complexity and still leaves duplicate / out-of-order code issues.
* LLM context limits are now large enough (GPT-4o) to hold the whole ``game.js`` (~300-400 LOC) each step.
* Simpler contract: every step receives the **entire source** and returns the **entire updated source**.

Goals:
1. Eliminate merge/hoisting bugs and temporal-dead-zone errors.
2. Keep the game single-file (``game.js``) & existing runtime unchanged.
3. Maintain testability, playability checks, and linting safeguards.

---

## 2 · High-Level Flow
```text
GameDesign → Planner → ContextStepBuilder (×N) → StaticChecker → RuntimePlayability
           ↘──────────────Retry via ContextStepFixer─────────────↙
```
* **SharedState.gameSource** holds the full JS code throughout the pipeline.
* On each step the agent gets `{ gameSource, plan, step }` and **must return the full updated file**.

---

## 3 · Agent Contracts
### 3.1 ContextStepBuilderAgent
Input (excerpt):
```jsonc
{
  "gameSource": "…whole game.js…",
  "step": { "id": 2, "description": "Add player movement" },
  "plan": [ {"id":1,"desc":"Setup"}, … ]
}
```
Output: `string` – the **complete** revised source.

Prompt guard-rails:
* Canvas-only: no DOM manipulation (no divs), no `alert()`, no external images.
* Preserve existing code unless editing the current step.
* Do not duplicate declarations.

### 3.2 ContextStepFixerAgent
Same contract, but receives `errors[]` and must fix them.

---

## 4 · Shared State Shape
```ts
interface SharedState {
  gameSource: string;      // full JS code, always up-to-date
  plan: Step[];
  step: Step;              // current step meta
  errors?: StaticError[];  // populated by StaticCheckerAgent if any
}
```

---

## 5 · Static Checker Additions
* Lint whole file (`eslint` rules already scoped to functional errors).
* Extra regex guard: reject `alert(`, `document.`, `new Image(`, or `.src = ".*\\.(png|jpg|gif)"`.
* Reject if > 2500 lines (prevent runaway prompt size).

---

## 6 · Failure / Retry Logic
1. **StaticChecker** errors → one retry via ContextStepFixer.
2. Fixer fails → escalate to Planner or abort.
3. Runtime failures handled as in v-2.

---

## 7 · Test Plan (TDD)
### Unit
* **ContextStepBuilderAgent** – mock LLM, ensure additions preserve old code.
* **StaticChecker** – assertions for image/sound guard & success path.

### Integration
* Run mini-pipeline with two steps using mocks; assert final code contains both features and RuntimePlayability passes.

---

## 8 · Roll-out
1. Implement on branch `pipeline-v3-context-incremental` (current).
2. Keep v-2 behind flag `PIPELINE_VERSION` for rollback/benchmarking.
3. CI runs both pipelines’ unit/integration tests.
4. When v-3 stability ≥ v-2, make it default.

---

*End of draft*
