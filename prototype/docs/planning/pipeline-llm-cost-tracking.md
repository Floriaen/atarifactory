# Plan: Provider-Accurate LLM Cost Tracking for Pipeline Runs

Status: Proposal (precise plan)
Owner: Game Agent Team
Target Branch: `feature/coding-llm-logging`

## Goal

Report accurate LLM token usage and estimated USD cost per pipeline run, using provider‑reported token metrics (not estimates), split by input (prompt) and output (completion), and aggregated across models.

## Scope
- Add prompt/completion token counters to `sharedState` (alongside existing `tokenCount`).
- Extend chainFactory callbacks to increment prompt/completion totals from provider metadata when available; fallback to `totalTokens`.
- Introduce a minimal pricing map (per 1K tokens, by model and direction).
- Compute and emit a `CostSummary` event at the end of the orchestrated run.
- Optional: include per‑call tokenDelta split in `/debug/llm` traces.

## Non‑Goals
- No external billing API calls.
- No persistence beyond in‑memory `sharedState` and the existing trace buffer.
- No changes to chain prompts or behavior.

## Design

### 1) Token accounting
- Source of truth: `output.llmOutput.tokenUsage` from LangChain → provider (OpenAI‑compatible).
- Fields (when present): `promptTokens`, `completionTokens`, `totalTokens`.
- Aggregation strategy (per run):
  - `sharedState.promptTokens += tokenUsage.promptTokens ?? 0`
  - `sharedState.completionTokens += tokenUsage.completionTokens ?? 0`
  - `sharedState.tokenCount += tokenUsage.totalTokens ?? (prompt+completion)` (retains existing total metric)
- Multi‑model note: also track per‑model buckets in an optional `sharedState.modelTotals[model] = { prompt, completion, total }` to support mixed model runs.

### 2) Pricing
- Static config (USD per 1K tokens): `server/config/pricing.config.js`
  ```js
  export const MODEL_PRICING_USD = {
    'gpt-4o':      { in: 5.00,  out: 15.00 },
    'gpt-4o-mini': { in: 0.15,  out: 0.60  },
    // default / fallback
    default:       { in: 1.00,  out: 2.00  }
  };
  ```
- Cost function:
  ```ts
  cost(model) = (promptTokens/1000)*in + (completionTokens/1000)*out
  ```
- Compute per model and grand total. Use `default` if model not present.

### 3) Emission & UI
- Orchestrator: after Coding completes, compute cost summary and emit
  ```json
  {
    "type": "CostSummary",
    "byModel": { "gpt-4o": { "prompt": N, "completion": M, "total": T, "usd": C } },
    "total": { "prompt": N, "completion": M, "total": T, "usd": C },
    "timestamp": "ISO8601"
  }
  ```
- `/debug/llm` (optional enhancement): include `promptDelta` and `completionDelta` in per‑call traces when available.

## Implementation Steps

1) Shared state shape
- Add (non‑breaking) fields via initialization defaults:
  - `sharedState.promptTokens = 0`
  - `sharedState.completionTokens = 0`
  - `sharedState.modelTotals = {}` (optional, lazy‑init)

2) chainFactory callback
- In `createTokenCountingCallback` (server/config/langchain.config.js):
  - Read `output.llmOutput.tokenUsage`.
  - Increment `sharedState.promptTokens`, `sharedState.completionTokens`, and `sharedState.tokenCount`.
  - If model known (`process.env.OPENAI_MODEL` or `llm` metadata), increment `modelTotals[model]` buckets.

3) Cost computation util
- New: `server/utils/costing.js`
  - Exports `MODEL_PRICING_USD` (or re‑export from config) and `computeCostTotals(sharedState)`.
  - Returns `{ byModel: { … }, total: { prompt, completion, total, usd } }`.

4) Orchestrator emit
- In `server/agents/pipeline/pipeline.js`, after Coding finishes:
  - Call `computeCostTotals(sharedState)` and `onStatusUpdate('CostSummary', payload)`.
  - Also log via `statusLogger.info('CostSummary', payload)`.

5) Optional traces
- In chainFactory per‑call trace payloads, include `promptDelta`/`completionDelta` alongside `tokenDelta` when available.

6) Tests
- Unit: `computeCostTotals` with synthetic token counts and multiple models.
- Integration: run planning/coding with MockLLM that returns `tokenUsage` and assert `sharedState.promptTokens/completionTokens` increment and `CostSummary` emitted.

## Acceptance Criteria
- `sharedState.promptTokens` and `sharedState.completionTokens` reflect provider‑reported usage; `sharedState.tokenCount` still aggregates totals.
- Cost summary event emitted with by‑model and total USD values; numbers match pricing map and tokens.
- No regressions in existing tests; new tests pass.

## Risks & Mitigations
- Missing tokenUsage in some providers → totals remain unchanged for those calls (documented).
- Model name mismatch → use `default` pricing tier; log a warning.
- Multi‑process concurrency not in scope → single run aggregation only.

## Follow‑Ups (Optional)
- Persist historical cost summaries for builds.
- Per‑phase cost breakdown (planning/art/coding) by tagging traces with `phase`.
- Configurable pricing via env or admin UI.
