# 🧠 CoT-Based Game Design Chain — Langchain Implementation (Example + Plan)

## ✅ Overview

This Langchain-powered `GameDesignChain` builds a **fun, coherent, and playable** game design through step-by-step reasoning.

---

## 🧪 Example Output

### 🎮 Title + Pitch

```json
{
  "title": "Laser Leap",
  "pitch": "Dodge rotating lasers and leap between platforms to survive the arena."
}
```

### ➶ Loop Clarification

```json
{
  "loop": "The player continuously moves and jumps between platforms while dodging lasers that rotate or move across the screen."
}
```

### 🔹 Mechanics

```json
{
  "mechanics": ["move", "jump", "avoid"]
}
```

### 🎯 Win Condition

```json
{
  "winCondition": "Survive for 45 seconds without touching any laser."
}
```

### 🧱 Entities

```json
{
  "entities": ["player", "platform", "laser", "timer"]
}
```

### ✅ Playability Heuristic Check

```json
"valid"
```

### 🤩 Final Game Definition

```json
{
  "title": "Laser Leap",
  "description": "Dodge rotating lasers and leap between platforms to survive the arena.",
  "mechanics": ["move", "jump", "avoid"],
  "winCondition": "Survive for 45 seconds without touching any laser.",
  "entities": ["player", "platform", "laser", "timer"]
}
```

---

## ⚙️ Chain Plan

```ts
const GameDesignChain = new SequentialChain({
  chains: [
    IdeaGeneratorChain,
    LoopClarifierChain,
    MechanicExtractorChain,
    WinConditionBuilderChain,
    PlayabilityHeuristicChain, // 🔍 validation checkpoint
    EntityListBuilderChain,
    FinalAssemblerChain
  ],
  inputVariables: [],
  outputVariables: ['gameDef']
});
```

---

## 📝 Chain Interface Contracts

| Chain Name                | Input Fields                              | Output Fields              | Description |
|---------------------------|-------------------------------------------|----------------------------|-------------|
| **IdeaGeneratorChain**    | `{}` (empty or seed object)               | `{ title, pitch }`         | Generates a creative game title and pitch. |
| **LoopClarifierChain**    | `{ title, pitch }`                        | `{ loop }`                 | Describes the core gameplay loop based on the idea. |
| **MechanicExtractorChain**| `{ title, pitch, loop }`                  | `{ mechanics }`            | Extracts a list of mechanics needed for the loop. |
| **WinConditionBuilderChain** | `{ mechanics, loop }`                   | `{ winCondition }`         | Defines a clear win condition for the game. |
| **EntityListBuilderChain**| `{ mechanics, loop, winCondition }`       | `{ entities }`             | Lists all entities required for the mechanics and win condition. |
| **PlayabilityHeuristicChain** | `{ gameDef }` (full object so far)     | `'valid'` or `'invalid: <reason>'` | Validates playability and coherence. |
| **FinalAssemblerChain**   | `{ title, pitch, loop, mechanics, winCondition, entities }` | `{ gameDef }` | Assembles the final game definition object. |

---

## 🔍 Heuristic Validator (PlayabilityHeuristicChain)

### Prompt:

```md
You are a playability heuristic validator for game designs. Given the following game definition, check:
- Is there a clear win condition?
- Are all entities referenced in mechanics and win condition present in the entity list?
- Is the core gameplay loop possible with the given mechanics and entities?
- Is the game winnable (not impossible)?

Respond with only one of:
- `"valid"` if the design is playable and coherent
- `"invalid: <reason>"` if not, with a short reason

Game Definition:
{gameDef}
```

---

## 📝 Design Notes & Suggestions

### 1. **State Passing Model**
- **Recommended:** Use a single evolving `gameDef` object that each chain modifies/extends. This makes debugging and pipeline extension much easier.
- **Example:**
  - `IdeaGeneratorChain` adds `title`, `pitch`
  - `LoopClarifierChain` adds `loop`
  - `MechanicExtractorChain` adds `mechanics`, etc.
- **Document** the expected shape of `gameDef` after each step for clarity.

### 2. **Testing & Validation**
- **Unit test** each chain in isolation: mock inputs, verify outputs.
- **Contract/integration test** the full pipeline: verify that outputs are always valid and playable.
- **Test failure cases** in the heuristic validator (e.g., missing win condition, impossible loop).

### 3. **Extensibility**
- The modular chain structure makes it easy to add, remove, or swap steps.
- To add a new design step, create a new chain and insert it into the `chains` array in `SequentialChain`.
- Keep prompt templates for each chain in separate files for maintainability.

### 4. **How to Extend**
- **Add a new chain:**
  1. Implement the new chain (e.g., `TutorialGeneratorChain`).
  2. Add it to the `chains` array in `GameDesignChain` at the appropriate position.
  3. Update documentation and tests to cover the new step.
- **Replace a chain:**
  1. Swap out the chain in the `chains` array.
  2. Ensure interface compatibility (input/output variables).

---

> **Tip:** Keep naming consistent between code and documentation for easy cross-referencing.

---

```txt
Given this loop: {{loop}}, these mechanics: {{mechanics}}, and this win condition: "{{winCondition}}",
Can the player actually reach this win condition using these mechanics?

If not, explain what’s missing.
If yes, return "valid".
```

---

## 🛡 Safety

* Rejects unplayable logic before reaching the planner.
* Prevents wasted runtime validation cycles.
* Can later be upgraded with simulation agent.