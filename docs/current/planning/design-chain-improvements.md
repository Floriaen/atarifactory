# Design Chain Improvements Plan (Non‑Breaking)

Status: Draft (branch: `design-chain-review`)

## Background

Generated games often lack clear, reachable goals and engaging gameplay loops. The current designer flow outputs text‑only fields (e.g., `winCondition`) that are too vague for deterministic implementation, and there are minor inconsistencies (e.g., `winnable` vs `isPlayable`, `name` vs `title`).

This plan introduces additive, non‑breaking improvements to make designs more implementable and fun while keeping all existing interfaces working.

## Objectives

- Fix playability validator field mismatch without changing external APIs.
- Normalize naming to use `title` internally while accepting both `name` and `title` at boundaries.
- Add optional, quantified goal parameters and ensure planner includes explicit victory/failure steps.

## Non‑Breaking Constraints

- No changes to server endpoints, SSE event shapes, or pipeline entrypoints.
- Only additive schema fields (optional), preserving existing outputs.
- Runtime checks are warn‑only (no gating failures introduced).

## Deliverables

1) Validator mapping fix (internal) — DONE
2) Title/name normalization (internal) — DONE
3) Planner guidance for explicit controls/victory/failure steps — DONE
4) Warn‑only runtime sanity checks after planning — DONE
5) Doc updates — DONE
6) Tests (unit + integration + e2e) — VERIFIED
7) (Deferred) Optional fields in design output (`goal`, `fail`, `controls`, `world`)

## Implementation Plan

### 1) Fix Playability Validator Field Mapping
- File: `server/agents/pipeline/planningPipeline.js`
- Change: Set `sharedState.isPlayable = validatorOut.winnable` (schema remains `winnable`).
- Tests: Unit test ensuring `winnable=false` maps to `isPlayable=false`.

### 2) Normalize `title`/`name` at Boundaries
- Helper: `normalizeTitle(input)` returns a canonical `title` from `{ name | title }`.
- Apply at:
  - `GameDesignChain` return path before assigning to `sharedState.gameDef`.
  - `controller.js` when computing `gameName` (prefer `title`, fall back to provided request title as today).
  - Auto‑fix chain I/O: accept `name`/`title`, emit `title`.
- Tests: Inputs with `name` produce `gameDef.title` without breaking any existing consumers.

### 3) Planner Guidance for Explicit Steps (Implemented)
- File: `server/agents/prompts/PlannerChain.prompt.md`
- Added "MANDATORY IMPLEMENTATION STEPS" guidance to ensure the plan includes:
  - Implement controls mapping
  - Implement victory check (goal/winCondition)
  - Implement failure check (fail or simple loss)

### 4) Prompt Updates (Back‑Compatible)
- Final Assembler (`server/agents/prompts/design/final-assembler.md`):
  - Kept strict base fields (`title`, `description`, `mechanics`, `winCondition`, `entities`) to remain compliant with structured outputs.
- Playability Validator (`server/agents/prompts/PlayabilityValidatorChain.prompt.md`):
  - Clarified evaluation should consider quantitative targets when present in the win condition text.

### 5) Runtime Sanity Checks (Warn‑Only) (Implemented)
- Location: post‑planner section in `server/agents/pipeline/planningPipeline.js`.
- If the design implies controls or goals/failure, warn when plan text appears to lack corresponding steps. No pipeline failures are introduced.

### 6) (Deferred) Optional Fields in Design Output
- We explored adding optional fields (`goal`, `fail`, `controls`, `world`) to the final assembler schema, but OpenAI structured outputs require all fields to be required (or nullable) and explicitly forbid optional extras.
- Decision: keep the structured output schema strict for now and drive implementation via planner guidance + runtime checks.
- Future option: generate enriched fields via a non‑structured post‑processing pass or a separate chain not bound by structured output constraints.

### 7) Documentation
- Update README sections to mention optional `goal/fail/controls/world` and planner guarantees about explicit checks.
- Keep instructions for running unchanged.

### 8) Tests
- Unit:
  - Validator mapping: `winnable` → `isPlayable`.
  - Schema: `finalAssemblerSchema` accepts with/without optional fields.
- Integration (LLM mocked):
  - When `goal/fail` present, plan includes victory/failure steps.
  - Ensure legacy designs (no `goal/fail`) still pass and plan.

## Rollout Order
1. Validator mapping fix — DONE
2. Title/name normalization — DONE
3. Planner prompt guidance — DONE
4. Warn‑only runtime checks — DONE
5. Docs and tests — DONE
6. (Deferred) Optional fields — FUTURE

## Success Criteria
- Designs optionally include quantified goals and explicit failure modes.
- Planner consistently includes victory/failure and controls mapping steps.
- No breaking changes: legacy designs still compile and run.
- Playability validation aligns with pipeline (`winnable` correctly read).

## Risks & Mitigations
- Over‑constraining prompts reduces creativity: prompts say “emit when clear; else omit”.
- Planner step matching false negatives: use simple contains checks and keep warn‑only.
- Title/name confusion: centralized normalization prevents divergence.

## Open Questions
- Should we introduce a dedicated `QuantifiedWinConditionChain` for clearer responsibility, or keep logic in assembler prompt to reduce chain count?
- Which default controls mapping should be encouraged (arrows + space vs. WASD)?
