# Architecture — Game Factory

Milestone 1 = the **design phase**: the factory autonomously produces one validated `GameDefinition` from scratch (no input). See [PRD.md](./PRD.md) for requirements.

## Design-phase flow
Diversity from parallel personas; rigor from an adversarial critic. Fun is a *proxy* here — the real fun gate is M2 (running the game).

```mermaid
flowchart TD
    start["start (fully autonomous — no input)"] --> diverge

    subgraph diverge["1 · DIVERGE — N persona generators, parallel"]
        direction LR
        p1["speedrunner"]
        p2["toy-maker"]
        p3["troll"]
        p4["minimalist"]
        p5["one-button"]
    end

    diverge -->|"N × {coreVerb, hook, goalMode, whyFun}"| select
    select["2 · SELECT — rank seeds against each other<br/>(fun × novel × feasible) — no absolute score"] --> elaborate
    elaborate["3 · ELABORATE — loop, mechanics(1–2),<br/>entities(1–3), goal — anchored to the hook"] --> critic
    critic{"4 · CRITIC (adversarial, reject-by-default)<br/>+ hard rules: caps, anti-clone"}
    critic -->|"REVISE(target) — re-run weak step only, ≤2"| elaborate
    critic -->|"PASS / force-accept at maxIterations"| assemble
    assemble["5 · ASSEMBLE — deterministic, no LLM<br/>normalize once (write boundary)"] --> gd["GameDefinitionV1 (.strict)"]

    style critic fill:#fde,stroke:#c39
    style assemble fill:#dfe,stroke:#3c9
    style gd fill:#def,stroke:#39c
```

Steps 1–4 are LLM chains; step 5 is pure code. Each step returns a typed delta folded into a **new frozen `DesignState`** — no mutable shared bag.

## Module layers & dependency direction
Chains depend on the `LLMProvider` **interface**, never a concrete SDK (DIP). Providers implement it; `MockProvider` and `ClaudeProvider` are interchangeable (LSP).

```mermaid
flowchart TD
    subgraph design["src/design"]
        run["runDesignPhase"] --> sg["seedGenerator"] & ss["seedSelector"] & el["elaborate"] & cr["critic"] & asm["assembleGameDefinition"]
    end

    subgraph contracts["src/contracts"]
        gd["GameDefinitionV1 + phaseSchemas (Zod)"]
    end

    subgraph llm["src/llm"]
        chain["defineChain (~100 lines)"]
        prov["LLMProvider (interface)"]
        prompts["prompts (markdown loader)"]
    end

    subgraph providers["src/llm/providers"]
        claude["ClaudeProvider"]
        mock["MockProvider"]
    end

    subgraph obs["src/observability"]
        observer["Observer (single fan-out)"]
        logger["Logger (pino)"]
        usage["Usage + Cost"]
        store["RunStore (runs/)"]
    end

    design --> chain
    design --> gd
    asm --> gd
    chain --> prov
    chain --> prompts
    chain --> observer
    claude -.implements.-> prov
    mock -.implements.-> prov
    observer --> logger & usage & store

    style prov fill:#def,stroke:#39c
    style chain fill:#dfe,stroke:#3c9
    style observer fill:#fde,stroke:#c39
```

## One chain call (`defineChain`) + observability seam
Explicit `format → invoke → parse`, then a single fan-out to the `Observer`. Usage is read from the response and **fails loud** if absent. `RunContext` is a required param everywhere (the type system enforces threading).

```mermaid
sequenceDiagram
    autonumber
    participant Orc as runDesignPhase
    participant Chain as defineChain
    participant Pr as prompts
    participant Prov as ClaudeProvider
    participant API as Anthropic API
    participant Obs as Observer → log/usage/store

    Orc->>Chain: run(input, {runContext})
    Chain->>Chain: inputSchema.parse(input)
    Chain->>Pr: load + render markdown
    Chain->>Prov: structured(outputSchema, system, msgs)
    Prov->>API: messages.parse (json_schema)
    API-->>Prov: data + response.usage
    Prov->>Prov: re-validate via same Zod; extractUsage (throw if missing)
    Prov-->>Chain: {data, usage, model}
    Chain->>Obs: llmCall(usage, ms, model, devTrace?)
    Chain-->>Orc: typed {data, usage}  (frozen delta)
```

## Run trace
Every run writes `runs/<traceId>/` — `events.jsonl` (streamed) + `trace.json` (finalized): node timings, per-call/per-model tokens from `response.usage` + USD cost, critic iterations, progress events. Inspect with `make view TRACE=<traceId>`.
