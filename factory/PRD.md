# PRD — Autonomous Atari-Game Factory

## 1. Problem
The existing `AtariFactory` prototype suffers from a **fake decoupling**: design and coding look separate but share one mutable `SharedState.gameDef` bag with no enforced contract — schema drift (`title`↔`name`), normalization scattered in three places, coding reading undocumented fields, gameDef `JSON.stringify`'d into prompts. It never runs the generated game, has no design feedback loop, and LangChain adds opacity (pipe hides failures, `withStructuredOutput` rewraps schemas, the token-counting callback silently swallows errors).

## 2. Goal
A rebuilt, **autonomous factory** (no human-in-the-loop) that invents small, simple, **Atari-like** playable browser games from scratch — no prompt or theme input. Design and coding are **truly decoupled** by a single versioned contract.

## 3. Scope
**Milestone 1 = the design phase only**, ending in one validated `GameDefinition`. Coding, art, and headless-run are later milestones — but the contract must anticipate them.

### Non-goals (M1)
Coding/codegen, sprites/art, headless game execution, server, frontend, human review gates.

## 4. Locked decisions
- **TypeScript** (strict, ESM) + **Zod** as source of types (`z.infer`) and runtime validation.
- **No LangChain, no LangGraph.** Thin provider SDK + one in-house `defineChain` helper (~100 lines). Explicit `format → invoke → parse`.
- **Provider-agnostic** behind `LLMProvider`; tune against **Claude first** (`claude-opus-4-8`). Model/preset parameterized, not env-only.
- **Bounded agentic refinement loop**: the adversarial critic (verdict, not a numeric score) can send the design back to refine. `maxIterations=2` per seed, then `maxSeeds=2` reseed fallback to the next-best seed; run-overridable.
- **Observability is a first-class requirement**: per-run trace, full LLM capture, token+cost from `response.usage`, per-node timing, progress events, **fail-loud**.

## 5. GameDefinition contract
`GameDefinitionV1` — `.strict()` Zod, `schemaVersion:'gamedef/v1'` (discriminated union for future versions). Canonical fields:
- `title` (**no `name`**), `description` (**no `pitch`**)
- **`coreVerb`** — the one thing the player does (e.g. "deflect", "wrap", "stack")
- **`hook`** — the single surprising twist the whole game is built around
- `loop` — the 10-second core loop
- `mechanics` (1–2), `entities` (1–3, unique `EntityId` `/^[a-z]+$/`, role enum)
- **`goal`** — discriminated union replacing mandatory win+fail: `{ type: 'survive' | 'score' | 'reach' | 'clear', ... }`
- **`controls`** — fixed virtual gamepad ONLY: `{ scheme:'gamepad', bindings:[{ input, action }] }`, `input ∈ {up,down,left,right,btn1,btn2}` (unique). Discrete press/release; **no tap/swipe/drag/aim/pointer**. The constraint lives at the design boundary so the factory can't propose touch-native mechanics it can't build.
- `spatial:{usesFullScreen:true, orientation}`, `estimatedPlaytimeSec`

Single writer + `.strict()` ⇒ drift structurally impossible. `parseGameDefinition` is the READ guard. The critic verdict (fun/novelty/anti-clone) is **not** in the contract — it rides the run artifact so coding never depends on a design-time score. **Litmus test:** the design phase must be swappable without breaking the contract.

## 6. Design flow
Optimized for **fun / new / simple**, not just "valid". Diversity comes from parallel personas; rigor from an adversarial critic.

`runDesignPhase(seed, deps, runContext)`:
1. **Diverge** — fire N **seed generators in parallel**, each a distinct designer persona/lens (speedrunner, toy-maker, troll, minimalist, one-button purist), sampled from a larger pool per run so personas don't become their own clichés. Each → `{ coreVerb, hook, goalMode, whyFun }`.
2. **Select (rank, don't score)** — the selector **compares the N seeds against each other** and returns a **best-first `ranking`** of all of them (most `fun × novel × feasible-under-constraints` first). Relative ranking, never absolute "7/10 fun" (LLMs are reliable at comparison, unreliable at absolute fun ratings). The head is the winner; the tail is the reseed fallback order.
3. **Elaborate** — expand the chosen seed into `loop`, `mechanics` (1–2), `entities` (1–3), `goal`, all **anchored to the hook**.
4. **Critic (adversarial, bounded)** — a skeptic prompted to **reject by default**: "cliché? which classic is this? fun in 10s? clear in one sentence?". Merged with deterministic **hard rules** (caps; **anti-clone** = names the closest classic and requires ≥1 core-dimension difference in `coreVerb`/`goal`/`hook`). Verdict → PASS or REVISE(target). On REVISE, **re-elaborate the chosen seed carrying the prior draft + targeted feedback** (a revision that keeps what works, not a regeneration), then re-assess. After `maxIterations` (≤2) without a pass, **reseed** to the next-best seed in the ranking (up to `maxSeeds`); if none passes, force-accept the **least-bad** candidate (fewest high-severity issues).
5. **Assemble** — `assembleGameDefinition(state)`, **deterministic, no LLM**. All normalization happens once, here.

Each step returns a typed delta folded into a **new frozen `DesignState`** — no mutable bag. Structured objects cross every boundary via `toPromptCapsule`. **Never `JSON.stringify` a gameDef into a prompt.**

> **Fun is a proxy until M2.** A text-spec critic can only judge *plausible* fun; real fun is emergent from the played loop. The design phase raises the floor (kills clichés, forces diversity) — the true fun gate is M2 actually running the game.

## 7. Observability
Immutable `RunContext` (traceId/gameId/model/devTrace) minted once, **required** param into every node. Single `Observer` fan-out → Logger (pino, `child({traceId})`) + UsageAggregator/CostAccountant + RunStore + progress. `extractUsage` throws `MissingUsageError` if `response.usage` absent. Cost keyed on actual per-call model (`claude-opus-4-8` = $5 in / $25 out per 1M; cache columns separate). `withNode` emits start/end(ms)/error and re-throws. Full prompt+response captured only when `devTrace`; usage/cost/timing always. `RunStore` streams `events.jsonl` + `trace.json`; viewable via HTTP read API + `view-run <traceId>` CLI.

## 8. Folder layout
```
src/llm/         provider.ts, providers/{claude,mock}.ts, models.ts, pricing.ts, prompts.ts, chain.ts
src/contracts/   gameDefinition.ts, phaseSchemas.ts
src/design/      designState.ts, personas.ts, chains/{types,index}.ts, seedGenerator.ts,
                 seedSelector.ts, elaborate.ts, critic.ts, assembleGameDefinition.ts, runDesignPhase.ts
src/observability/ runContext.ts, logger.ts, observer.ts, llmCall.ts, cost.ts, usage.ts,
                 runStore.ts, progress.ts, withNode.ts, viewer/routes.ts
prompts/design/  *.prompt.md
bin/             view-run.ts
test/            contract/, prompts/, chain/, e2e/, helpers/
runs/            (gitignored)
```

## 9. Build order (bottom-up)
1 skeleton → 2 `provider.ts` → 3 `models.ts`+`pricing.ts` → 4 observability core → 5 `prompts.ts` → 6 **`defineChain`** → 7 `MockProvider` → 8 contracts + tier-1 tests → 9 `designState`+`personas` → 10 chain types → 11 `seedGenerator` → 12 `seedSelector` (rank) → 13 `elaborate` + prompts + tier-2 tests → 14 `critic` (adversarial + anti-clone hard rules) → 15 `assembleGameDefinition` → 16 `runDesignPhase` + tier-3 mock e2e → 17 `ClaudeProvider` → 18 viewer+CLI → 19 gated live e2e.

## 10. Testing (TDD, 4 tiers, MockProvider-first)
- **T1 contract** — pure Zod (canonical fields, regex, caps).
- **T2 prompt-render** — variable sync, no unreplaced placeholders.
- **T3 mock chain/orchestrator** — full design phase + bounded termination + observability emission; deterministic, zero network. Critic via scripted verdicts (`[REVISE, PASS]`) → asserts one targeted revise then accept; selector ranking is deterministic given fixtures.
- **T4** — ONE gated live-Claude e2e (`RUN_REAL_LLM=1`), structural invariants only, cost>0. CI runs T1–T3.

## 11. Acceptance criteria (M1)
- Autonomous run (no input) → `GameDefinition` passing **write + read** validation; canonical fields enforced (no name/pitch, `coreVerb`+`hook` present, `goal` union, mechanics≤2, entities≤3, EntityId regex, full-screen).
- Diverge→select→elaborate→critic→assemble runs end-to-end; select ranks N seeds; critic+anti-clone bounded, targeted, run-configurable.
- Tiers 1–3 deterministic + green; lint clean.
- Per-run `RunTrace` with traceId, node timings, per-call/per-model tokens-from-`response.usage` + USD cost, `refinementIterations`, progress events — viewable after exit.
- Fail-loud verified (`MissingUsageError`, errors re-thrown, failed calls still traced).
- Swappability litmus: full design phase runs on `MockProvider` and `ClaudeProvider` without touching chain code.
- One live e2e on `claude-opus-4-8` with cost>0.

## 12. Risks
1. Zod→Anthropic JSON Schema drops constraints → prefer `messages.parse()` + re-validate through full Zod.
2. Refinement non-convergence → causal-order re-runs + re-assess each round + `maxIterations` + history.
3. `defineChain` scope creep → timing/status in `withNode`, fan-out in `Observer`.
4. Forgetting to thread RunContext/Observer → make both required params.
5. `extractUsage` on streamed responses → `.finalMessage()` first.
6. Preset effort/cost guesses → start creative=high / structured=medium / validation=low; tune after T4.
7. Don't re-import the prototype's `SharedState`/`designContext`/divergent schemas — parse-on-read is the guard.

## 13. Port / rewrite / drop
- **PORT**: preset table (retyped, no temperature), token/cost aggregation, entity-naming rule (now shared Zod refinement), versioned-contract idea, weighted progress, layered-test pattern. (Prompts are **rewritten**, not ported — the old idea-first waterfall prompts don't fit the persona/critic flow.)
- **REWRITE**: MockLLM→`MockProvider`, chainFactory→`defineChain`, drifted schemas→one `GameDefinitionV1`, idea-first waterfall→persona diverge + rank-select + adversarial critic, mandatory win+fail→`goal` union, absolute playability score→relative ranking + anti-clone, traceBuffer→`Observer`+`RunStore`, winston→pino.
- **DROP for M1**: coding/art/sprites, mutable `SharedState`, scattered normalization, `designContext`/`mergeContext`.
