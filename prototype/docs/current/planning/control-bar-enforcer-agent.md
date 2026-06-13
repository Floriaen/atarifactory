# Control Bar Enforcer Agent: AST-Based Input Enforcement Plan

## Objective
Guarantee that all LLM-generated games use only the virtual control bar (gamepad) for gameplay input, by rewriting game.js files to remove all keyboard, mouse, and direct canvas input handling, and enforce exclusive use of controlBar events.

## Approach
- Use Babel to parse and transform JavaScript (game.js) AST.
- Apply strict, mechanical code transformations to:
  - Remove all event listeners for keyboard, mouse, and touch events.
  - Remove direct assignments to input event handlers (e.g., `document.onkeydown`, `canvas.onmousedown`).
  - Ensure only `gamepad-press` and `gamepad-release` events are handled for gameplay input.
  - (Optional) Inject standard controlBar event handlers if missing.
- Do NOT modify HTML or inject controlBar assets (handled elsewhere in the pipeline).

## Implementation Steps (TDD)
1. **Setup**
   - Create `server/agents/chains/ControlBarEnforcerAgent.js` (the agent).
   - Create `server/agents/chains/__tests__/ControlBarEnforcerAgent.test.js` (the tests).
   - Ensure Babel is available as a dependency.

2. **Write Tests First (TDD)**
   - Test: Removes all keyboard event listeners (keydown, keyup, keypress).
   - Test: Removes all mouse/touch/canvas event listeners (mousedown, mouseup, touchstart, etc).
   - Test: Leaves controlBar event listeners (`gamepad-press`, `gamepad-release`) untouched.
   - Test: Optionally injects controlBar event handlers if missing.
   - Test: Does not modify unrelated code or game logic.
   - Test: Idempotency (running twice is safe).

3. **Implement Agent**
   - Use Babel to parse the JS code.
   - Traverse and transform the AST as per requirements.
   - Return the transformed code.

4. **Integrate**
   - Add the agent as a post-processing step in the pipeline for all generated game.js files.
   - Ensure tests pass and maintain coverage as new patterns are discovered.

## Notes
- The agent operates on a single JS file (game.js) per game.
- All asset injection (HTML/CSS/JS for controlBar) is handled at packaging, not by this agent.
- This approach is deterministic, testable, and robust for compliance enforcement.

---

*Last updated: 2025-07-07*
