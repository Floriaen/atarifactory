## Game Generation : Strategy – Technical Specification

### 1. Overview

This system automatically generates playable vanilla JS Canvas games from minimal input. It follows a hybrid strategy combining pattern-based generation, step-by-step code planning, and runtime validation.

**Pipeline Summary:**

```
GameDesignAgent → PlannerAgent → Step loop:
  StepBuilderAgent → StaticCheckerAgent → StepFixerAgent (if needed) → BlockInserterAgent
  → SyntaxSanityAgent → RuntimePlayabilityAgent (only after all steps complete) → FeedbackAgent (if needed)
```

---

### 2. Agents & Interface Contracts

#### 2.1 GameDesignAgent

**Input:**

```json
{ "title": "Coin Collector" }
```

**Output:**

```json
{
  "title": "Coin Collector",
  "description": "Collect all coins while avoiding spikes.",
  "mechanics": ["move left/right", "jump", "collect", "avoid"],
  "winCondition": "Collect all 10 coins",
  "entities": ["player", "coin", "spike"]
}
```

**Example Prompt:**
"Generate a simple 2D canvas game design for the title 'Coin Collector'. Include description, mechanics, and win condition."

#### 2.2 PlannerAgent

**Input:** Game definition JSON

**Output:** Ordered array of build steps:

```json
[
  { "id": 1, "label": "Setup canvas and loop" },
  { "id": 2, "label": "Add player and controls" },
  { "id": 3, "label": "Add coins and scoring" },
  { "id": 4, "label": "Add spikes and loss condition" },
  { "id": 5, "label": "Display win/lose text" }
]
```

**Prompt Example:**
"Create a step-by-step plan to build this game in vanilla JS using the mechanics listed."

#### 2.3 StepBuilderAgent

**Input:**

* currentCode
* step: { id, label }

**Output:** Code block (new or updated function)

**Prompt Template:**
"Here is the current game code and a step labeled '{{label}}'. Please generate the corresponding function or logic to complete this step."

#### 2.4 BlockInserterAgent

**Input:**

* currentCode
* stepCode

**Output:**

* new currentCode (after safe function replacement or insertion)

**Behavior:**

* Match function names or code patterns and replace or append safely.
* Applies internal formatting/linting to the updated code using Prettier or ESLint to ensure consistency and prevent runtime diffs.

#### 2.5 StaticCheckerAgent

**Input:**

* currentCode + stepCode

**Output:**

* List of errors (duplicate declarations, undeclared variables, syntax issues)

#### 2.6 StepFixerAgent

**Input:**

* currentCode
* step
* error list

**Output:**

* corrected stepCode (not the full currentCode)

**Scope:**

* Fixes only the code generated for the current step (stepCode)
* Does **not** modify or rewrite the full currentCode — only the faulty part from StepBuilderAgent

**Prompt Template:**
"Fix the step code for '{{label}}'. Here are the errors found: {{errorList}}"

**Behavior:**

* After fixing, the corrected code is automatically formatted/linted internally to maintain consistency before merging or testing.

#### 2.7 RuntimePlayabilityAgent

**Input:**

* Assembled game.js

**Output:**

* Pass/fail report
* Basic runtime log:

```json
{
  "canvasActive": true,
  "inputResponsive": true,
  "playerMoved": true,
  "winConditionReachable": true
}
```

**Runtime Environment:**

* **Node.js 18+**
* **Testing/Simulation:** Puppeteer (preferred), jsdom (fallback)
* **Canvas Boot:** Inject and render canvas in a headless browser context
* **Output Files:**

  * /games/game.js
  * /games/plan.json
  * /games/runtime.json
  * /games/logs/errors.json (optional)

#### 2.8 FeedbackAgent

**Input:**

* Failure logs from runtime

**Output:**

* Retry target (fixer or planner)
* Suggest fix direction

#### 2.9 SyntaxSanityAgent

**Input:**

* Full game.js

**Output:**

* Syntax check result using `new Function(code)`
* Reports fatal errors such as:

  * SyntaxErrors
  * Missing canvas binding
  * Unexpected token or EOF
* Confirms code is loadable as a single executable JS file

---

### 3. Orchestration Logic

* The main controller manages step execution and agent calls.
* Every modification to the source code—whether from a new step or a fix—triggers a validation loop:
* Each step includes:

  * generation → static check → fix (if needed) → merge
  * Then enters a loop: full static check → fix (if needed) → re-check
  * Loop continues until no static issues remain, then proceeds to FinalTesterAgent and runtime test.
* After all static validations pass, SyntaxSanityAgent runs a syntax validation on the entire game.js output before any runtime execution.
* Before this final check, the complete code is once again formatted to ensure structural and stylistic consistency.
* Formatter (non-agent) is applied:

  * Immediately after each BlockInserterAgent merge
  * Immediately after StepFixerAgent correction
* This check/fix loop ensures that both the newly generated step and the full integrated source code are statically valid before any runtime test is performed. The SyntaxSanityAgent confirms the final JS is parseable before running it.

If any runtime test fails:

* FeedbackAgent analyzes the issue and routes to FixerAgent or PlannerAgent
* If sent to FixerAgent, a new static check → fix → re-check loop is started before retrying runtime validation
* Caching: currentCode is saved after each successful step

---

### 4. Code Formatting and Linting

Formatting is handled internally by agents that modify the code. It is not an agent itself, but a shared utility used to ensure consistency before validation and runtime.

**Tools Used:**

* **Prettier** (default config + overrides):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "trailingComma": "none",
  "printWidth": 80
}
```

* **ESLint** (with `eslint:recommended` + autofix enabled)

**Integration Points:**

* `BlockInserterAgent` calls formatter after each code merge
* `StepFixerAgent` formats corrected code before reinsertion

---

### 5. Agent Dependencies

| Agent                   | Needs full context? | Shared state access   |
| ----------------------- | ------------------- | --------------------- |
| StepBuilderAgent        | Yes                 | plan, currentCode     |
| BlockInserterAgent      | Yes                 | currentCode           |
| StaticCheckerAgent      | Yes                 | stepCode, currentCode |
| StepFixerAgent          | Yes                 | errors, step          |
| RuntimePlayabilityAgent | Yes                 | full game.js          |
| FeedbackAgent           | Yes                 | runtime logs, step id |

---

### 6. Example Output

#### Game Definition

```json
{
  "title": "Gem Jumper",
  "description": "Jump between platforms to collect gems.",
  "mechanics": ["move", "jump", "collect"],
  "winCondition": "Collect 5 gems"
}
```

#### Plan

```json
[
  { "id": 1, "label": "Setup canvas" },
  { "id": 2, "label": "Add player and jump" },
  { "id": 3, "label": "Add platforms" },
  { "id": 4, "label": "Add gems and collect logic" },
  { "id": 5, "label": "Display score and win" }
]
```

#### Final Output

* `game.js`: complete game file
* Playable in browser with keyboard input

---

### 7. Additional Features (Optional / Future Work)

* Config system for setting retry limits, strict mode, timeouts
* GameTypeAgent for supporting genres: runner, platformer, puzzle, etc.
* BehaviorToMechanicsAgent: turn user behavior into game definition
* UI wrapper for preview + regenerate on failure
* Game history / diff tracking

---