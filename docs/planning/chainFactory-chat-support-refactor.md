# Plan: Add Chat Prompt Support to `chainFactory` and Refactor IncrementalCodingChain

Status: Proposal (precise plan)
Owner: Game Agent Team
Target Branch: `feature/coding-llm-logging`

## Goal

Add first‑class chat prompt support to `server/utils/chainFactory.js` via `createChatChain`, then refactor `IncrementalCodingChain` to use it. Preserve system/human roles, keep uniform token counting + tracing (like all chains), and avoid breaking existing tests.

## Scope
- New API: `createChatChain({ chainName, systemFile, humanFile, inputVariables, schema?, preset?, llm?, sharedState?, enableLogging? })`.
- Instrumentation: token counting via `sharedState`, structured traces in dev (`ENABLE_DEV_TRACE=1`).
- Refactor `IncrementalCodingChain` to call `createChatChain` instead of manual `ChatPromptTemplate` composition.
- No behavioral change to outputs (string code), only logging/telemetry improvements.

## Non‑Goals
- No changes to other chains (they already use `createStandardChain`).
- No schema for `IncrementalCodingChain` (still raw string output).
- No prompt content changes beyond wiring existing files.

## Design

### 1) `createChatChain` API
- Input:
  - `chainName: string` – logical name for logs/traces.
  - `systemFile: string` – path under `server/agents/prompts/`.
  - `humanFile: string` – path under `server/agents/prompts/`.
  - `inputVariables: string[]` – variables available to both messages.
  - `schema?: ZodSchema` – optional structured output support (applied to base LLM before callbacks, same as `createStandardChain`).
  - `preset?: 'creative'|'structured'|'planning'|'validation'` – selects model/temperature.
  - `llm?: ChatOpenAI` – custom instance (optional).
  - `sharedState?: SharedState` – enables token counting.
  - `enableLogging?: boolean` – default `true`.
- Behavior:
  - Load the two prompt files (system + human) from `server/agents/prompts/`.
  - Build `ChatPromptTemplate.fromMessages([System, Human])`.
  - Configure LLM (structured output if `schema`), then attach callbacks for token counting when `sharedState` is provided.
  - Apply standard `createChainConfig` metadata and the common `handleLLMEnd` debug hook.
  - Return `{ invoke(input) }`, adding the same validation on `inputVariables` as `createStandardChain`.
  - Tracing: On invoke, capture hydrated prompt (best‑effort), start/end time, compute `tokenDelta` from `sharedState` (before/after) and call `addLlmTrace` when `ENABLE_DEV_TRACE=1`.

### 2) IncrementalCodingChain refactor
- Change factory signature to `async function createIncrementalCodingChain(llm, options = {})` to align with other chains.
- Replace current `ChatPromptTemplate + StringOutputParser` with a call to `createChatChain`:
  - `chainName: 'IncrementalCodingChain'`
  - `systemFile: 'IncrementalCodingChain.system.prompt.md'`
  - `humanFile: 'IncrementalCodingChain.human.prompt.md'`
  - `inputVariables: ['gameSource','plan','step','entities']`
  - `preset: 'creative'` (unchanged behavior; temp remains 0/explicitly set by caller if needed)
  - `sharedState: options.sharedState`
- Backward compatibility:
  - Provide a small wrapper to default `entities` to `'[]'` in `invoke` if missing, preserving existing test expectations that do not pass it.

### 3) Telemetry parity
- Token counting: Use existing `createTokenCountingCallback(sharedState, chainName)` from `langchain.config.js`.
- Tracing fields (same as `createStandardChain`): `chain`, `model`, `durationMs`, `inputVars`, `hydratedPrompt`, `output`, `tokenDelta`, `traceId` (from `sharedState.traceId`), and a `phase: 'coding'` metadata for the coding agent.

## Implementation Steps

1) Implement `createChatChain` in `server/utils/chainFactory.js`:
   - Load two prompt files, build `ChatPromptTemplate.fromMessages`.
   - Mirror structured output and callback hookup from `createStandardChain`.
   - Add guarded hydrated prompt capture (best‑effort `prompt.format(input)` on aggregated template where possible) and tracing.

2) Refactor `server/agents/chains/IncrementalCodingChain.js`:
   - Export `async function createIncrementalCodingChain(llm, { sharedState } = {})`.
   - Internally call `createChatChain` with the current `.system.prompt.md` and `.human.prompt.md` files.
   - Keep the `entities` default to `'[]'` in `invoke` as a compatibility shim.

3) Ensure callers pass `sharedState`:
   - `codingPipeline.js` already passes `{ sharedState }`. No change expected.

4) Tests:
   - Unit: `IncrementalCodingChain` – mock LLM (MockLLM) and assert string output still returned; add one test that omits `entities` to ensure default path.
   - Integration: Re‑run existing coding pipeline tests to ensure no regressions.
   - E2E: Confirm `/debug/llm` contains traces for `IncrementalCodingChain` when `ENABLE_DEBUG=1 ENABLE_DEV_TRACE=1`.

## Rollout & Backward Compatibility
- No schema changes or prompt content edits; only wiring.
- Keep the `entities` default in chain `invoke` to avoid breaking tests that call the chain directly.
- If unexpected in CI, fall back to previous factory temporarily by feature flag (optional).

## Acceptance Criteria
- `IncrementalCodingChain` LLM calls appear in `/debug/llm` with `phase: 'coding'` and `tokenDelta` > 0 when applicable.
- All tests pass (`npm test`) with no changes to expected outputs.
- `sharedState.tokenCount` increments during coding steps.
- No change to generated `game.js` content attributable to the refactor.

## Risks & Mitigations
- Risk: Prompt hydration for tracing in chat mode is partial.
  - Mitigation: Best‑effort formatting; still capture model/duration/output/tokenDelta.
- Risk: Test mocks lacking `.withConfig`/`.withStructuredOutput`.
  - Mitigation: Use existing guards in `chainFactory` (only call if functions exist) or adjust mocks in tests.

## Follow‑Ups (Optional)
- Add a generic `phase` option to chainFactory for tracing (`'planning'|'art'|'coding'|'validation'`).
- Introduce `createMultiMessageChain` for more than two roles (e.g., system → developer → user).
- Consider a light schema for code fences to reduce accidental non‑code chatter in outputs.
