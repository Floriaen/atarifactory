# Technical Debt Remediation Plan

Focus: address the three highest-priority technical debt items impacting code quality and pipeline reliability.

## 1. Make Static Checker Consume Real Generated Code
- **Issue**: `StaticCheckerChain` is invoked with `currentCode: '{}'` and `stepCode: '{}'`, so ESLint never sees the actual generated source. Real lint errors slip through until runtime.
- **Goals**:
  - Feed the accumulated `sharedState.gameSource` (and step-level output when available) to `staticCheckerRun`.
  - Surface failures to the pipeline so the run can halt or at least mark the coding phase as failed.
  - Preserve token counting and tracker events.
- **Plan**:
  1. Refactor `runCodingPipeline` to pass the in-progress code into the static checker call. When plan steps produce incremental output, lint that snippet too.
  2. Update `StaticCheckerChain.run` to handle larger inputs efficiently (e.g., pass file name metadata for clearer messages).
  3. Adjust tests to assert that lint errors are captured and propagated, adding fixtures with deliberate violations.
  4. Decide on failure policy (fail fast vs. warn) and document it for downstream consumers.

## 2. Standardize LLM Construction Across Pipelines
- **Issue**: Planning, coding, and art pipelines each instantiate `new ChatOpenAI` directly. That bypasses `createStandardLLM` presets, duplicates env handling, and skips shared callbacks for token/cost tracking.
- **Goals**:
  - Route all LLM construction through `createStandardLLM`/`createEnhancedLLM`.
  - Ensure the correct preset (creative/structured/etc.) reaches each chain.
  - Maintain centralized retry, timeout, and logging behavior.
- **Plan**:
  1. Introduce helpers (e.g., `getPlanningLLMs`, `getCodingLLM`) that wrap `createStandardLLM` with the right preset and shared state.
  2. Replace direct `new ChatOpenAI` calls in `planningPipeline.js`, `codingPipeline.js`, and `artPipeline.js` with these helpers.
  3. Update unit tests to stub the factory rather than raw constructors; add regression coverage ensuring token counters update.
  4. Document the convention in `docs/` so new chains follow the same pattern.

## 3. Align Control Bar Transformer with Chain Conventions
- **Issue**: `ControlBarTransformerAgent` still follows an agent naming pattern and expects the caller to supply an LLM. Because `codingPipeline` injects a zero-temperature LLM, the chain’s `preset: 'creative'` never gets applied, reducing transformation quality.
- **Goals**:
  - Rename the module/export to `ControlBarTransformerChain` and align file/prompt naming.
  - Let the chain construct its own creative-preset LLM by default while still supporting dependency injection for tests.
  - Keep compatibility with existing tests and pipeline hooks.
- **Plan**:
  1. Rename files/exports (`ControlBarTransformerAgent.js` → `ControlBarTransformerChain.js`) and update imports across pipelines and tests.
  2. Adjust the factory so it calls `createStandardChain` without requiring an external LLM, defaulting to the creative preset when none is provided.
  3. Update `runCodingPipeline` to stop overriding the LLM unless running in mock mode, ensuring the creative preset is in effect.
  4. Refresh unit tests to use the new name and verify that, without an injected LLM, the chain still runs using the creative configuration.

---
**Next Steps**
1. Prioritize the static checker fix (Item 1) to catch regressions instantly.
2. Standardize LLM construction (Item 2) to stabilize downstream metrics and behavior.
3. Complete the control-bar chain alignment (Item 3) to restore intended presets.

Deliverables include code changes, updated tests, and documentation updates linked above.
