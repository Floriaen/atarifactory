# DesignContext Migration Plan (without LangGraph)

Status: Draft
Owner: Game Agent Team
Last updated: 2025-09-10

## Objectives

- Introduce a canonical, typed `DesignContext` as the sole input to all design chains.
- Preserve current external APIs and keep `sharedState` for cross-cutting concerns (progress, tokens, logs).
- Improve consistency across Idea → Loop → Mechanics → Win → Entities → Playability → Final assembly.
- Maintain strict, reliable tests; support future iteration without architectural churn.

## Scope

- Chains affected (input becomes `{ context }`):
  - `IdeaGeneratorChain`
  - `LoopClarifierChain`
  - `MechanicExtractorChain`
  - `WinConditionBuilderChain`
  - `EntityListBuilderChain`
  - `PlayabilityHeuristicChain`
  - `FinalAssemblerChain`
- Orchestrator: `GameDesignChain` builds and threads `context` immutably.
- Planning pipeline calls `GameDesignChain` with `{ context }` only.
- Prompts updated to consume `{context}` (single variable), with deterministic capsule formatting.

## Non-Goals

- No LangGraph adoption in this iteration.
- No changes to external endpoints (`/generate-stream`) or frontend contracts.
- `sharedState` remains infra-only (no domain data moved into it).

## DesignContext

Schema (v1):

```ts
type DesignContextV1 = {
  version: 'v1';
  title?: string;
  pitch?: string;
  constraints?: string;
  loop?: string;
  mechanics?: string[];
  winCondition?: string;
  entities?: string[];
  notes?: string[];
}
```

Helpers (new file: `server/utils/designContext.js`):

- `mergeContext(base, delta)`: copy-on-write merge with validation.
- `validateContext(ctx)`: Zod validation for `DesignContextV1`.
- `contextToPrompt(ctx, limit=600)`: deterministic “Context” capsule string with a hard character cap (env `CONTEXT_CAPSULE_LIMIT`, default 600). Order: title → pitch → constraints → loop → mechanics → winCondition → entities.

Rationale:
- Explicit, immutable context enhances scalability, testability, and future parallelization.
- Deterministic capsule keeps token costs bounded and prompts stable.

## Chain Contract Changes

All chains accept `{ context }` only and return a delta (or result):

- `IdeaGeneratorChain({ context }) → { title, pitch, constraints? }`
- `LoopClarifierChain({ context }) → { loop }`
- `MechanicExtractorChain({ context }) → { mechanics }`
- `WinConditionBuilderChain({ context }) → { winCondition }`
- `EntityListBuilderChain({ context }) → { entities }`
- `PlayabilityHeuristicChain({ context }) → { playabilityAssessment, strengths, potentialIssues, score }`
- `FinalAssemblerChain({ context }) → { gameDef }`

Prompts: Update `inputVariables` to `['context']` and reference `{context}`. Remove per-field variables.

## Orchestrator Changes (GameDesignChain)

- Initialize `context` from inbound input (support legacy `{ title, pitch, constraints }`).
- For each phase: call chain with `{ context }`, merge returned delta into `context` via `mergeContext`.
- After `EntityListBuilderChain`, keep building through `PlayabilityHeuristicChain`, then pass `{ context }` to `FinalAssemblerChain`.
- Attach `playability` to `final.gameDef` after assembly.
- Emit existing CoT logs and a `contextSnippet: contextToPrompt(ctx, 300)` into traces.

## Planning Pipeline Integration

- Call `GameDesignChain` with `{ context }` only.
- Leave weights and progress emission as-is.
- Keep `sharedState` only for token counting, logging, and status events.

## Testing Strategy

Unit (chains):
- Update all design chain unit tests to pass `{ context }` and assert structured outputs (no per-field inputs).
- Continue using `MockLLM` and `FlexibleMalformedLLM` to exercise success/error paths.

Unit (helpers):
- New tests for `mergeContext`, `validateContext`, and `contextToPrompt` determinism and limits.

Orchestrator:
- New `GameDesignChain.contextPropagation.test.js` that:
  - Mocks each chain, verifies `.invoke({ context })` is called.
  - Asserts deltas are merged and `context` evolves across phases.

Integration:
- Update design integration tests to create and pass `{ context }`.
- Add “drift” tests ensuring mechanics and win condition stay aligned with title/pitch/constraints.

E2E:
- Keep existing assertions on final `gameDef`; update bootstrapping to provide `{ context }` if needed.

## Observability

- Enhance trace entry (`addLlmTrace`) for design steps with `contextSnippet` (first ~300 chars).
- Viewer already supports full prompt display; this will aid debugging.

## Configuration

- `CONTEXT_CAPSULE_LIMIT` (default 600): hard cap for `contextToPrompt`.
- Future flag (optional): `DESIGN_CONTEXT_VERSION` for schema evolution.

## Migration & Rollout

1) Implement helpers and schema.
2) Migrate chains to `{ context }` input and update prompts.
3) Update `GameDesignChain` to thread `context` end-to-end.
4) Update unit tests (chains + helpers) and orchestrator tests.
5) Update integration tests; run full suite.
6) Update docs (architecture specs + codebase map).

Compatibility:
- This is a deliberate breaking change for design chains and their tests; done in a single PR to avoid drift.
- External API (server endpoints) unchanged.

## Risks & Mitigations

- Token budget growth: cap `context` capsule and use deterministic ordering.
- Prompt sensitivity: comprehensive unit/integration tests and strict Zod validation.
- Hidden coupling: explicit schema and immutable merges reduce accidental overrides.

## Acceptance Criteria

- All design chains accept `{ context }` only and pass updated tests.
- GameDesignChain builds and threads `context` immutably; context propagation test passes.
- Integration and e2e tests pass; no regressions in final `gameDef` quality.
- Docs updated to reflect new contract and helper APIs.

## Timeline (suggested)

- Day 1: Implement helpers + migrate 2–3 chains + unit tests.
- Day 2: Migrate remaining chains + GameDesignChain + orchestrator tests.
- Day 3: Update integration tests, run full suite, fix regressions.
- Day 4: Docs + final polish + PR.

