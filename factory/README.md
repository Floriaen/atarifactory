# Game Factory

An **autonomous factory** that invents small, simple, Atari-like playable browser games from scratch — no human in the loop, no prompt or theme required.

This is a ground-up rebuild of the `AtariFactory` prototype, fixing its core flaw: design and coding were only *nominally* decoupled. Here they are separated by a single versioned contract, with bounded agentic refinement and first-class observability.

## Status
**Milestone 1 — the design phase**: autonomously produces a validated `GameDefinition` (no input). Coding, art, and headless game-execution come in later milestones.

## Architecture at a glance
- **TypeScript** (strict) + **Zod** as the single source of types and runtime validation.
- **No LangChain / no LangGraph** — a thin provider SDK plus one ~100-line `defineChain` helper. Explicit `format → invoke → parse`.
- **Provider-agnostic** (`LLMProvider`); tuned against **Claude** first, swappable.
- **One versioned contract** (`GameDefinitionV1`), validated on write by design and on read by coding.
- **Bounded refinement loop**: a playability heuristic can send the design back to refine, capped at `maxIterations`.
- **Observability is first-class**: per-run trace, full LLM capture, token+cost from `response.usage`, per-node timing, fail-loud.

## Project structure
```
src/llm/            provider, Claude + mock providers, defineChain helper, prompts, models, pricing
src/contracts/      GameDefinitionV1 (the design↔coding contract)
src/design/         design chains, refinement loop, assemble (write boundary)
src/observability/  RunContext, Observer, logger, usage/cost, run store, viewer
prompts/design/     external markdown prompts
test/               contract / prompts / chain / e2e tiers
```

## Getting started
```bash
make start            # ONE COMMAND: setup (install + .env) then run the design phase
make help             # list all targets
make test             # tiers 1–3 (deterministic, no network)
make test-e2e         # one live Claude run (needs ANTHROPIC_API_KEY)
make view TRACE=<id>  # inspect a run's full trace
```

## Engineering principles
This codebase is held to **KISS, DRY, YAGNI, SOLID** and **TDD**. See [CLAUDE.md](./CLAUDE.md) for how each applies here and the non-negotiable architectural rules.

## Docs
- [PRD.md](./PRD.md) — full requirements, scope, contract, acceptance criteria.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — flow, module, and sequence diagrams (mermaid).
- [CLAUDE.md](./CLAUDE.md) — engineering principles + architectural rules for contributors and agents.
