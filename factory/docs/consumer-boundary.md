# The Consumer Boundary — keep hosts out of the factory

## The rule
**The factory core (`src/`) depends on no consumer.** A *consumer* (a "host") is
anything that runs the factory: the CLIs in `bin/`, the admin UI, tests, a future
service. Hosts depend on the factory; the factory never depends on a host.

Concretely, there must be **no admin/UI/CLI-specific type, parameter, import, or
branch anywhere under `src/`**. No `if (admin)`, no `formatForAdmin`, no "the UI
needs this field" knobs. A host adapts to the factory through the seams below —
the factory never bends toward a host.

This is the SOLID stance the rest of the code already follows (DIP: chains depend
on the `LLMProvider` interface, not a provider), applied to the *outer* boundary:
the factory is a library; hosts are its callers.

## The mechanism: one public API + generic seams
Hosts import **only** from [`src/api.ts`](../src/api.ts) — the single, stable
surface. Internal paths (`src/design/...`, `src/observability/...`) are private and
may be refactored freely as long as `api.ts` holds. Through it, a host drives the
factory with four generic, consumer-agnostic seams:

| Need | Seam | Notes |
|---|---|---|
| Which model backend runs | `selectProvider(name?)` → `LLMProvider` | DIP. `'claude'` (API) or `'claude-code'` (subscription). A host can also pass its own `LLMProvider`. |
| Force a model / effort tier | phase `…Deps.modelOverride?: Partial<ModelConfig>` | Generic. Applies to every chain in the phase; the design critic's Opus default yields to it. Model metadata for a picker comes from `PRESETS` / `*_MODEL`. |
| Live progress, logs, cost | `Observer` + `FactorySink` | The factory **emits** `FactoryEvent`s (`node_start`/`node_end`/`node_error`/`llm_call`/`progress`); it never knows who listens. A host passes `sink` and adapts events to SSE, a TUI, an assertion, etc. |
| The data across boundaries | `GameDefinition` / `SpritePack` + `parse*` guards | Typed contracts; parse, don't trust. |

Run files (`runs/<traceId>/…`) are still produced by the optional `RunStore` — a
host opts in by passing it, same as the CLIs do.

## Why a sink, not log-scraping
The structured `FactorySink` exists so a host gets clean, typed live signal
**without** parsing the pino log stream or reaching into observability internals.
Logs (pino) stay for humans; the sink is for machines. One generic interface, every
host reuses it.

## What this buys the admin UI
A host that builds an `Observer` with a `sink` forwarding `FactoryEvent`s, picks a
provider/tier via the existing seams, and renders the typed contracts adds **nothing
to `src/`**. If a consumer is deleted tomorrow, the factory is untouched.

## The boundary is now a *network* boundary (admin only)
The admin no longer links the factory in-process. The same seams above are exposed
over HTTP by the **pipeline service** (`server/`, host `bin/serve.ts`) — a thin,
**stateless** shell over `api.ts`:

```
admin/web (React) ──/api──► admin/server (BFF) ──HTTP/NDJSON──► pipeline service ──► src/api.ts
   cache · registries · persistence · SSE replay bus            stateless: provider/model + stream only
```

- The shared wire shapes live in their own zero-dep package,
  [`@game-factory/contracts`](../contracts) (Zod schemas + types + parse guards + the
  stream protocol). `src/api.ts` re-exports it; the admin imports **only** it.
- The pipeline runs **one phase per request** and forgets it — no `RunStore`, no
  registries, no replay. The admin owns all state and mints run identity (`x-run-id`).
- A dropped admin connection aborts the run: the `…Deps.signal?: AbortSignal` seam
  threads cancellation through the phase → provider (abort-on-disconnect).
- This is enforced in CI by `no-restricted-imports` (see `eslint.config.js`):
  `admin/**` may import `@game-factory/contracts` only — never `src/**`, `server/**`,
  or `@anthropic-ai/**`.

The CLIs in `bin/` stay **in-process** library hosts; the network boundary is the
admin's alone. See [pipeline-service-decoupling.md](./pipeline-service-decoupling.md)
and [admin-interface.md](./admin-interface.md).

## Checklist when adding a host feature
1. Can it be expressed through an existing seam (provider, `modelOverride`, `sink`,
   contracts)? Do that.
2. If not, add a **generic** capability to the factory (useful to *any* host) and
   export it from `api.ts` — never a host-named one.
3. Never `import` anything from a host directory into `src/`.
4. Host-specific formatting/presentation lives in the host, from the typed output.
