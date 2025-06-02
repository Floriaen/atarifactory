## Game Generation : Strategy – Technical Specification

### 1. Overview

This system automatically generates playable vanilla JS Canvas games from minimal input. It follows a hybrid strategy combining pattern-based generation, step-by-step code planning, and runtime validation.

**Note:** For all code merging and insertion, the system will use AST-based (Abstract Syntax Tree) code manipulation tools (such as Recast or Babel) to ensure robust, safe, and context-aware code updates.

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

* currentCode (the full code generated so far)
* plan (the full ordered list of build steps)
* step: { id, label } (the current step description)

**Note:**
To ensure robust, incremental, and non-redundant code generation, StepBuilderAgent always receives the full plan, the current code, and the current step. This allows the agent to:
- Avoid redeclaring functions or variables
- Integrate new logic with existing code
- Understand the overall structure and dependencies

If the codebase becomes very large, context summarization strategies (such as including only relevant functions, or summarizing unchanged sections) may be used to stay within LLM prompt limits.

**Output:** Code block (new or updated function)

**Prompt Template:**
"Here is the current game code, the full plan, and a step labeled '{{label}}'. Please generate the corresponding function or logic to complete this step."

**Example:**

*Input (currentCode):*
```js
function update() {
  // existing logic
}
```
*Input (plan):*
```json
[
  { "id": 1, "label": "Setup canvas and loop" },
  { "id": 2, "label": "Add player and controls" },
  { "id": 3, "label": "Add coins and scoring" },
  { "id": 4, "label": "Add spikes and loss condition" },
  { "id": 5, "label": "Display win/lose text" }
]
```
*Step (label):* "Extend the 'update' function to add collision detection."

*Output (stepCode):*
```js
// collision detection logic
if (player.x < coin.x + coin.width && player.x + player.width > coin.x && player.y < coin.y + coin.height && player.y + player.height > coin.y) {
  // collect coin
}
```

#### 2.4 BlockInserterAgent

**Note:**
BlockInserterAgent is not an LLM agent. It is a deterministic, programmatic utility that uses AST-based code manipulation (e.g., Recast, Babel) to merge or insert code blocks safely and reliably.

**Input:**

* currentCode (full function or file)
* stepCode (code to insert)

**Output:**

* new currentCode (after safe function replacement or insertion)

**Behavior:**

* Uses AST-based (Abstract Syntax Tree) code manipulation to find the correct function and insert or merge the new logic safely.
* Match function names or code patterns and replace or append safely.
* Applies internal formatting/linting to the updated code using Prettier or ESLint to ensure consistency and prevent runtime diffs.

**Example:**

*Input (currentCode):*
```js
function update() {
  // existing logic
}
```
*Input (stepCode):*
```js
// collision detection logic
if (player.x < coin.x + coin.width && player.x + player.width > coin.x && player.y < coin.y + coin.height && player.y + player.height > coin.y) {
  // collect coin
}
```
*Output (new currentCode):*
```js
function update() {
  // collision detection logic
  if (player.x < coin.x + coin.width && player.x + player.width > coin.x && player.y < coin.y + coin.height && player.y + player.height > coin.y) {
    // collect coin
  }
  // existing logic
}
```

#### 2.5 StaticCheckerAgent

**Input:**

* currentCode + stepCode

**Output:**

* List of errors (duplicate declarations, undeclared variables, syntax issues)

#### 2.6 StepFixerAgent

**Input:**

* currentCode (the full code generated so far)
* step (the current step object from the plan, e.g., { id, label })
* error list

**Note:**
The 'step' input is the current step object from the plan (see PlannerAgent), typically including an id and label. This provides the agent with the context and intent for the code it is fixing, ensuring the correction matches the step's purpose.

**Output:**

* corrected stepCode (not the full currentCode)

**Scope:**

* Fixes only the code generated for the current step (stepCode)
* Does **not** modify or rewrite the full currentCode — only the faulty part from StepBuilderAgent

**Prompt Template:**
"Fix the step code for '{{label}}'. Here are the errors found: {{errorList}}"

**Behavior:**

* After fixing, the corrected code is automatically formatted/linted internally to maintain consistency before merging or testing.

**Example:**

*Input (stepCode):*
```js
if (player.x < coin.x + coin.width && player.x + player.width > coin.x) {
  // collect coin
}
```
*Input (step):*
```json
{ "id": 3, "label": "Add coins and scoring" }
```
*Error List:*
- ReferenceError: coin is not defined

*Output (corrected stepCode):*
```js
if (player && coin && player.x < coin.x + coin.width && player.x + player.width > coin.x) {
  // collect coin
}
```

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

**Example:**

*Input (full game.js):*
```js
function update() {
  // ...
}
function draw() {
  // ...
}
```
*Output:*
- Syntax check passed (no errors)

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

### 6. Error Handling and Recovery

- If a static check fails, **StepFixerAgent** is invoked to correct the step. This loop continues until the step passes or a retry limit (configurable, e.g., 3 attempts) is reached.
- If a runtime test fails, **FeedbackAgent** analyzes the error and routes to either **FixerAgent** (for code fixes) or **PlannerAgent** (for plan revision).
- All errors and recovery attempts are logged to `/games/logs/errors.json` for traceability and debugging.
- If a step or fix fails repeatedly (exceeds retry limit), the pipeline aborts and returns an error to the user/API client.
- User-facing errors are returned in the API response and may be displayed in the UI for transparency.

**Error Routing Table:**

| Error Type         | Handling Agent      | Next Step if Fails Again         |
|-------------------|--------------------|----------------------------------|
| Static error      | StepFixerAgent     | Retry up to N times, then abort  |
| Runtime error     | FeedbackAgent      | Route to FixerAgent or PlannerAgent |
| FixerAgent fails  | (Controller)       | Abort and report error           |
| PlannerAgent fails| (Controller)       | Abort and report error           |

**Logging:**
- All errors, retries, and agent decisions are logged to `/games/logs/errors.json`.

**User Feedback:**
- API responses include error details if the pipeline aborts.
- UI may display error messages or suggestions for retrying or revising input.

---

### 7. Example Output

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

### 8. Additional Features (Optional / Future Work)

* Config system for setting retry limits, strict mode, timeouts
* GameTypeAgent for supporting genres: runner, platformer, puzzle, etc.
* BehaviorToMechanicsAgent: turn user behavior into game definition
* UI wrapper for preview + regenerate on failure
* Game history / diff tracking

---

### 9. 5 game generation strategy + hybrid comparison tables

| **Root**                                 | **Description**                                                                                    | **Strengths**                                                          | **Weaknesses**                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **1. Iterative, Plan-Driven Generation** | A PlannerAgent defines atomic build steps, each executed and validated in order.                   | High control; easy to debug step-by-step; modular                      | Brittle if plan is bad; LLM lacks foresight; coordination overhead      |
| **2. Code-Based Pattern Extraction**     | Extract mechanics and win logic from working game code; generate new games from learned structure. | Grounded in real code; reduces hallucinations; promotes variation      | Needs quality examples; less control per step; hard to fix mid-way      |
| **3. Behavior-First Game Discovery**     | Start from desired player behavior; design is derived around it.                                   | Human-centered; gameplay-first; fun-driven                             | Very abstract; complex logic generation; needs smart agents             |
| **4. Asset-Driven Game Construction**    | Starts with assets (sprites, layout); agents infer the logic to support them.                      | Fast to visualize; compatible with creative tools; inspires design     | May lack coherent gameplay; logic is hard to reverse-engineer           |
| **5. Agent-as-Player Feedback Loop**     | Auto-play the game post-generation to detect failure or boring gameplay.                           | Catch unplayable/broken games; enables real testing; mimics QA         | Needs runtime engine/sim; slower; complex feedback handling             |
| **6. Hybrid (OpenAI-style)**             | Combines pattern-driven generation, plan-driven building, and agent-based feedback loop.           | Pattern grounding; reliable execution; real-world validation; scalable | Higher system complexity; more agents to manage; orchestration overhead |

---

### 10. Extensibility Guidelines

To add a new agent or swap out an existing one in the pipeline:

1. **Define the Agent Contract:**
   - Specify the agent's input, output, and expected behavior in the documentation (see Section 2 for examples).
   - Write prompt templates and test cases if the agent is LLM-driven.

2. **Implement the Agent:**
   - Create a new module for the agent, following the structure of existing agents.
   - Ensure the agent is stateless and receives all required context via arguments.

3. **Update the Pipeline:**
   - Insert the new agent into the orchestration logic at the appropriate step.
   - If replacing an agent, update all references and ensure the new agent's contract matches or adapts as needed.

4. **Update Validation and Error Handling:**
   - Add or update static/runtime checks and error routing as needed.
   - Ensure the agent's errors are logged and surfaced to the user if relevant.

5. **Document the Change:**
   - Update this specification and any relevant READMEs to reflect the new or updated agent.
   - Add example inputs/outputs for the new agent.

6. **Test the Integration:**
   - Add unit and integration tests for the new agent and its pipeline interactions.
   - Run end-to-end tests to ensure the pipeline remains robust.

**Best Practices:**
- Keep agents modular and stateless.
- Use clear, versioned contracts for agent inputs/outputs.
- Document all changes and update examples.
- Encourage contributions by providing templates and clear extension points.

This approach ensures the system remains future-proof, maintainable, and welcoming to new contributors.
