# Game Generation Experiment Protocol

## Objective

Test two approaches for agentic game code generation:

* **A. Step-wise generation (current pipeline style)**
* **B. Architecture-first generation (function map upfront)**

---

## Game Spec

### Title

Simple Dodger (Extended: Coin Runner)

### Description

* Player moves left/right.
* Obstacles fall from top.
* Player avoids obstacles.
* Win after 30 seconds.
* Collect coins for score.
* Special power-ups can slow obstacles.
* Player has lives; loses one on collision.

---

## Build Plan (Extended to 10 steps)

```json
[
  { "id": 1, "description": "Setup canvas and game loop" },
  { "id": 2, "description": "Add player entity and movement" },
  { "id": 3, "description": "Add falling obstacles" },
  { "id": 4, "description": "Implement collision detection" },
  { "id": 5, "description": "Implement win/lose condition" },
  { "id": 6, "description": "Add coin entities that spawn randomly" },
  { "id": 7, "description": "Implement coin collection logic (increase score)" },
  { "id": 8, "description": "Display score on screen" },
  { "id": 9, "description": "Implement special power-up that slows obstacles" },
  { "id": 10, "description": "Add lives system: lose life on obstacle hit, game over when lives reach 0" }
]
```

---

## Protocol A — Step-wise generation (current pipeline simulation)

### For each step:

1. Prompt LLM:

> "Given current code (paste full code), and step description "{description}", generate the code to implement this step. Always return the full updated code including the entire codebase after applying the step, not only the new or modified code."

2. Copy-paste LLM output to your local code.
3. Merge manually (simulate BlockInserterAgent).
4. Proceed to next step.

### Experimental Finding

* For this current experiment, with full code context given at each step, **Protocol A performed much better than expected**.
* Even with 10 steps and multiple entities, the LLM managed to generate coherent full code without function redefinitions or merge conflicts.
* Design clarity and consistent prompting played a big role in maintaining clean generation.
* This suggests that for simple to mid-complexity games, the step-wise approach remains viable under strict prompt control.

---

## Protocol B — Architecture-first generation (function map upfront)

### Architecture Map (for prompt injection)

```pseudocode
Functions:
- init(): setup canvas, initialize variables
- gameLoop(): main loop calling update() and draw()
- update(): update game state each frame
- draw(): render game state
- handleInput(): update player direction
- updatePlayer(): move player
- updateObstacles(): move obstacles
- updateCoins(): spawn and move coins
- updatePowerUps(): spawn and handle power-ups
- handleCollisions(): check collisions with obstacles and coins
- updateScore(): handle scoring logic
- checkWinLose(): verify game end condition
```

### For each step:

1. Prompt LLM:

> "You are coding inside an existing architecture with these functions:
> "init(), gameLoop(), update(), draw(), handleInput(), updatePlayer(), updateObstacles(), updateCoins(), updatePowerUps(), handleCollisions(), updateScore(), checkWinLose()".
> Implement the step: "{description}".
> Only add logic into the appropriate functions. Always return the full updated code including the entire codebase after applying the step, not only the new or modified code."

2. Copy-paste LLM output to your local code.
3. Merge manually (simulate BlockInserterAgent).
4. Proceed to next step.

### Benefits of protocol B

* Much more stable even with many steps
* Forces function reuse and separation of concerns
* Scales better as game complexity grows

---

## Notes

* Always provide the full current code state at each step.
* Only the prompt style changes between A and B.
* This protocol allows you to see LLM behavior with and without architecture guidance.

---

## Output Comparison

| Metric                  | Observation                         |
| ----------------------- | ----------------------------------- |
| Code consistency        | Very good in Protocol A so far      |
| Function duplication    | None observed                       |
| Merge conflicts         | None observed                       |
| Input handling quality  | Stable                              |
| Runtime behavior        | Fully functional                    |
| Overall maintainability | Satisfactory for current complexity |

---

## Adjustment Guide

* You can reuse this protocol with any game idea.
* Simply update:

  * Game Spec
  * Build Plan
  * Architecture Map

---

## Cost Capacity Chart

| Scenario                              | Total Tokens | Cost Estimate |
| ------------------------------------- | ------------ | ------------- |
| 1 step                                | \~13,800     | \~\$0.14      |
| Full game (10 steps)                  | \~138,000    | \~\$1.40      |
| Extended game (20 steps)              | \~276,000    | \~\$2.80      |
| Extended pipeline capacity (max safe) | \~1M tokens  | \~\$10-\$12   |

* Token estimation includes both input (full code context) and output (full code regeneration).
* Pricing based on GPT-4o (June 2025) at \$5 per million input tokens and \$15 per million output tokens.
* Current experiment stays well within GPT-4o context window.

---

**End of Protocol**