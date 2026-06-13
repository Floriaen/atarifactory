# CLAUDE.md — Game Factory

Guidance for anyone (human or agent) writing code here. These rules override defaults. See [PRD.md](./PRD.md) for scope.

## What this is
An autonomous factory that invents small Atari-like browser games from scratch — no input. **Milestone 1 = design phase only**, ending in one validated `GameDefinition`. Design and coding are decoupled by that single versioned contract.

## Engineering principles (enforced)
- **KISS** — Prefer the boring, explicit solution. Control flow is plain `await format → invoke → parse`. No clever abstractions, no frameworks where a function will do. If a reviewer can't follow it in one read, simplify.
- **DRY** — One source of truth: Zod schemas define both types (`z.infer`) and validation. Normalization happens **once**, at the write boundary (`assembleGameDefinition`) — never re-derive fields downstream.
- **YAGNI** — Build only what Milestone 1 needs. No coding/art/server/HITL code yet. No config knobs "just in case". Don't re-grow a framework inside `defineChain`.
- **SOLID** —
  - *SRP*: each chain does one design step; each module one job (`usage` counts, `cost` prices, `observer` fans out).
  - *OCP*: add a provider or a design chain without editing existing ones.
  - *LSP*: `MockProvider` and `ClaudeProvider` are fully interchangeable behind `LLMProvider`.
  - *ISP*: `LLMProvider` exposes only `structured()` — the one call shape we need.
  - *DIP*: chains depend on the `LLMProvider` interface, never a concrete SDK.

## TDD (mandatory)
Red → green → refactor. **Write the failing test first.** Four tiers, MockProvider-first:
1. **Contract** — pure Zod (canonical fields, `EntityId` regex, mechanics≤2/entities≤3 caps).
2. **Prompt-render** — variables sync, no unreplaced placeholders.
3. **Mock chain/orchestrator** — full design phase, refinement count, bounded termination, observability emission. Deterministic, zero network. Refinement via `scriptedHeuristic([3,7])` ⇒ `iterations===1`.
4. **Live e2e** — ONE, gated by `RUN_REAL_LLM=1`; assert structural invariants only, never exact text.

CI runs tiers 1–3. Mock only at the provider + heuristic boundary, never the orchestrator.

## Non-negotiable architectural rules
- **No LangChain, no LangGraph.** Thin SDK + the ~100-line `defineChain` helper. Timing/status live in `withNode`; fan-out in `Observer` — keep `defineChain` small.
- **One versioned contract**: `GameDefinitionV1`, `.strict()`. Canonical `title`/`description` — **never** `name`/`pitch`. Single writer; `parseGameDefinition` is the read guard.
- **Import Zod from `zod/v4`**, not `zod`. The Anthropic structured-output helper (`zodOutputFormat` → `z.toJSONSchema`) requires v4 schemas; mixing plain `zod` (v3) schemas breaks `ClaudeProvider` at runtime and fails typecheck.
- **Immutable phase outputs.** Each chain returns a typed delta folded into a **new frozen** `DesignState`. **No mutable shared-state bag.** Never re-import the prototype's `SharedState`/`designContext`/`mergeContext`.
- **Structured objects across boundaries.** Never `JSON.stringify` a gameDef into a prompt — use `toPromptCapsule`.
- **Fail loud.** No silent error swallowing. `extractUsage` throws `MissingUsageError` if `response.usage` is missing. Log errors with stack and re-throw; failed calls still get traced.
- **Usage from the response.** Read tokens from `response.usage` — never estimate.
- **RunContext + Observer are required params** on every node (the type system enforces threading).
- **Claude params**: depth via `output_config.effort`. **Never** send `temperature`/`top_p`/`budget_tokens` (400 on 4.8). Prefer `messages.parse()` (json_schema) and re-validate through the same Zod schema.

## Commands
```bash
npm test                          # tiers 1–3
RUN_REAL_LLM=1 npm run test:e2e   # gated live Claude run
npm run view-run <traceId>        # inspect a run trace
npm run lint
```

## Before submitting
1. Tests written first and green (tiers 1–3). 2. Lint clean. 3. No new field read that isn't in a published schema. 4. Token/cost traced for every LLM call.
