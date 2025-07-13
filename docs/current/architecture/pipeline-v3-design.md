# Pipeline-v3 – Creative Game Generation Architecture

> **Deprecation Notice:** All pre-v3 pipelines and agent-based flows are deprecated. Only pipeline-v3 (Langchain-based) is maintained. See the [root README](../README.md) for the latest architecture, extension guidelines, and directory structure.

> **Directory Update:** All design/planning chains are now located in `server/agents/langchain/chains/design/`. Use this directory for any new or extended design/planning chains.

> **Token Counting:** A token counter is planned for the UI, using the `tokenCount` field in the shared state, to estimate LLM cost per generation.


> **Note:** This pipeline is implemented using modular [Langchain](https://js.langchain.com/) chains. All pre-Langchain pipelines are deprecated; only pipeline-v3 (Langchain-based) is supported. For a high-level overview and getting started, see the root README.md.

## High-Level Pipeline Flow

```
GameInventorChain
      ↓
GameDesignChain
      ↓
PlannerChain
      ↓
ContextStepBuilderChain (×N)
      ↓
StaticCheckerChain
      ↓
SyntaxSanityChain
      ↓
RuntimePlayabilityChain
      ↓
FeedbackChain
```

---

## Chain Roles & Data Flow

### 1. GameInventorChain
- **Purpose:** Generates a new game idea, producing a creative `name` (title) and `description`.
- **Output Example:**
  ```json
  {
    "name": "Shadow Lanterns",
    "description": "In a mystical village where night never ends, you play as Lumi, a brave child armed with magical lanterns..."
  }
  ```

### 2. GameDesignChain
- **Purpose:** Designs the game mechanics, entities, and win condition based on the invented idea.
- **Input:**
  ```json
  {
    "name": "Shadow Lanterns",
    "description": "In a mystical village where night never ends, you play as Lumi..."
  }
  ```
- **Output Example:**
  ```json
  {
    "title": "Shadow Lanterns",
    "description": "...",
    "mechanics": ["move left/right", "jump", "place lantern", ...],
    "winCondition": "...",
    "entities": ["Lumi (player)", "magical lantern", ...]
  }
  ```

### 3. PlannerChain
- **Purpose:** Breaks down the game design into a sequenced plan of implementation steps.
- **Output Example:**
  ```json
  [
    { "id": 1, "description": "Set up the HTML canvas and main game loop." },
    { "id": 2, "description": "Create the player character Luma..." },
    ...
  ]
  ```

### 4. ContextStepBuilderChain
- **Purpose:** Iteratively implements each plan step, always receiving and returning the full game source code.
- **Input:**
  ```json
  {
    "gameSource": "...",
    "plan": [...],
    "currentStep": { "id": N, "description": "..." }
  }
  ```
- **Output:** Updated full `gameSource` string.

### 5. StaticCheckerChain
- **Purpose:** Lints and checks the entire code for functional and forbidden patterns (e.g., no `alert()`, no external images).

### 6. SyntaxSanityChain
- **Purpose:** Checks code syntax (no LLM used).

### 7. RuntimePlayabilityChain
- **Purpose:** Runs the game in a headless browser to check for playability (canvas active, win condition reachable, etc).

### 8. FeedbackChain
- **Purpose:** Provides suggestions for improvement or retries if issues are detected.

---

## Shared State Structure

```ts
interface SharedState {
  name: string;          // Invented game name
  description: string;   // Invented game description
  gameDef: { ... };      // Game design output
  plan: Step[];          // List of implementation steps
  gameSource: string;    // Full JS source code
  currentStep?: Step;    // Current plan step
  errors?: StaticError[];// For fixer agent
  tokenCount?: number;   // For UI cost estimation
  ...
}
```

---

## Test & Validation
- **Integration tests** ensure the invented idea propagates from invention to design and into the final game.
- **Mocks** are used for LLMs in CI, with tests verifying creative propagation.
- **Token counting** is included for UI cost estimation.

---

## Notes
- The pipeline is fully modular; each agent can be tested and replaced independently.
- Only pipeline-v3 is supported and maintained going forward.

---

## 1 · Motivation
* The previous AST-merge strategy introduced complexity and still left duplicate / out-of-order code issues.
* LLM context limits are now large enough (GPT-4o) to hold the whole ``game.js`` (~300-400 LOC) each step.
* Simpler contract: every step receives the **entire source** and returns the **entire updated source**.

Goals:
1. Eliminate merge/hoisting bugs and temporal-dead-zone errors.
2. Keep the game single-file (``game.js``) & existing runtime unchanged.
3. Maintain testability, playability checks, and linting safeguards.

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
3. Runtime failures are handled as in previous versions, but only pipeline-v3 is now maintained.

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
2. Pipeline-v3 is the only supported and tested pipeline moving forward.
2. CI runs all pipeline-v3 unit/integration tests.
3. Pipeline-v3 is now the default and only supported pipeline.

---

*End of draft*
