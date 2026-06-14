# Admin Interface — Run the Factory Phases from a Browser

## Context
The factory now has two autonomous phases — **design** (`runDesignPhase` → `GameDefinition`)
and **art** (`runArtPhase` → `SpritePack`) — each driven today only from CLIs
(`make run`, `make batch`, `make art`). This plan adds a **local admin UI** to trigger
those phases, pick a model/provider, watch progress + logs live, and preview the results
(a formatted design summary and the rendered sprites).

This is a **dev/operator tool**, not part of the shipped pipeline. It lives in its own
`admin/` area and depends on the core factory **only through the existing phase entry
points and contracts** — it adds no logic to the pipeline, so the KISS/DRY/YAGNI rules
the factory enforces stay intact. The one small, OCP-friendly change to core is an
optional `modelOverride` on the two phase deps (below).

**Decisions (locked):** Express backend + Vite/React frontend; **run-and-preview only**
(no run-history browser); the art phase **chains from the design run** just produced (and
is also selectable from the batch cache). Localhost-only, no auth.

## Goal
One page, two phase panels (Design, Art). For each: a provider/model selector, a Run
button, a live progress bar, a streaming log, a cost readout, and a result preview —
a clean formatted card for the `GameDefinition`, canvas-rendered sprites for the
`SpritePack`. Running design makes its `GameDefinition` the default input for art.

## Architecture
```
browser (Vite/React :5173)  ──HTTP /api──►  Express (:8787)  ──in-process──►  runDesignPhase / runArtPhase
        ▲                                        │                                   │ Observer
        └──────────── SSE /api/stream/:id ◄──────┴── per-run EventBus ◄──────────────┘ (logger + progress)
```
- **In-process, not shelling out to the CLI.** The server imports `runDesignPhase` /
  `runArtPhase` and builds the same `Observer`/`UsageAggregator`/`RunStore` the CLIs do,
  so file traces under `runs/<traceId>/` are still written exactly as today.
- **Live signal without touching core.** The `Observer` already fans out to an injected
  `logger` and an optional `ProgressTracker` listener. The server injects:
  - a **`ProgressTracker` with an SSE listener** → progress events (free; built-in).
  - a **pino logger writing to a custom `Writable`** at `debug` level that parses each
    JSON log line and forwards it to the run's EventBus → log lines, per-call model, and
    `costUsd`/`usage` (logged by `Observer.llmCall`). No core change needed.
- **EventBus per run**: a tiny in-memory emitter keyed by `traceId`; the SSE endpoint
  subscribes, replays buffered events on connect (so a slightly-late client misses
  nothing), and closes on `done`/`error`.

## Backend (Express, `tsx`)
New dir **`admin/server/`**:
- **`bus.ts`** — `RunBus`: `emit(event)`, `subscribe(fn)`, a bounded replay buffer,
  `close()`. A `Map<traceId, RunBus>` registry with TTL cleanup.
- **`observer.ts`** — `buildStreamingObserver(ctx, bus)`: wires `UsageAggregator`,
  `RunStore`, the SSE `ProgressTracker` listener, and the pino→bus stream. Returns
  `{ observer, usage, store }`. This is the only place that adapts core observability to
  the stream.
- **`runs.ts`** — `startDesign(opts)` / `startArt(opts)`: mint `RunContext`, build the
  streaming observer, kick off the phase **without awaiting** (returns `traceId`
  immediately), and on settle emit `done` (artifact + `usage.totals()`) or `error`, then
  `store.finalize(...)` and `bus.close()`. Holds the produced `GameDefinition`s in an
  in-memory `Map<traceId, GameDefinition>` so art can chain off a design run id.
- **`index.ts`** — the Express app + routes; serves the built web app from
  `admin/web/dist` in one process (`make admin` runs Vite dev separately for HMR).

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/models` | provider list + model tiers for the selectors (derived from `models.ts`). |
| `GET`  | `/api/designs` | selectable art inputs: this session's design runs + `runs/cache/design-games.json` entries (`{traceId, title, source}`). |
| `POST` | `/api/run/design` | body `{ provider, modelTier?, numSeeds? }` → `{ traceId }`. |
| `POST` | `/api/run/art` | body `{ provider, modelTier?, source }` where `source = {kind:'run', traceId} | {kind:'cache', traceId}` → `{ traceId }`. |
| `GET`  | `/api/stream/:traceId` | **SSE**: `progress` / `log` / `done` / `error`. |
| `GET`  | `/api/result/:traceId` | final artifact JSON (for reload/late-join). |

### SSE event shapes
```ts
{ type:'progress', phase, completed, total, fraction, label? }
{ type:'log', t, level, node?, msg, ms?, model?, costUsd?, usage? }
{ type:'done', traceId, kind:'design'|'art', artifact, usage:{ inputTokens, outputTokens, costUsd, calls } }
{ type:'error', message }
```

### Model selection (small core change)
Expose a **provider** toggle (`claude` API vs `claude-code` subscription — reuse
`selectProvider`'s switch, parameterised) and a **model tier**:
- `default` (the tuned per-chain tiering — no override),
- `opus` (force `claude-opus-4-8` on every chain),
- `sonnet` (force `claude-sonnet-4-6`).

To apply a tier, add an optional `modelOverride?: Partial<ModelConfig>` to **`DesignDeps`**
and **`ArtDeps`**, threaded into each `defineChain({ provider, observer, modelOverride })`
call. In `runDesignPhase` the critic keeps its Opus override **unless** a UI tier is set,
in which case the explicit tier wins (`modelOverride ?? { model: OPUS_MODEL, effort:'medium' }`).
This is additive (OCP) — existing callers pass nothing and behave exactly as now.

## Frontend (Vite + React, TS)
New dir **`admin/web/`** — `index.html`, `vite.config.ts` (dev proxy `/api` → `:8787`),
`src/`:
- **`lib/api.ts`** — `postRun()`, `openStream(traceId, onEvent)` (EventSource), `getDesigns()`, `getModels()`.
- **`lib/sprite.ts`** — `drawSprite(canvas, frames, gridSize)`: the boolean-mask → canvas
  renderer (port of the throwaway PNG script — scaled cells, on/off colours, per-frame).
- **`components/PhasePanel.tsx`** — shared shell: selector row + Run button + `ProgressBar`
  + `LogView` + a `children` preview slot. Disables Run while a stream is open.
- **`components/ModelSelect.tsx`** — provider + tier dropdowns from `/api/models`.
- **`components/ProgressBar.tsx`**, **`components/LogView.tsx`** (auto-scroll, level colour,
  shows node + ms + per-call cost).
- **`components/DesignPreview.tsx`** — formatted card from the `GameDefinition`: title +
  description, `coreVerb`/`hook`/`loop`, mechanics list, entities (id · role · desc), goal
  (typed), controls (gamepad bindings), orientation, est. playtime, total cost. (Formatting
  mirrors the human-readable block in `bin/batch-design.ts`.)
- **`components/ArtPreview.tsx`** — one labelled canvas group per entity (frames side by
  side via `drawSprite`), grid size + frame count, total cost.
- **`App.tsx`** — two `PhasePanel`s. On a design `done`, stash the `GameDefinition` +
  traceId in state and preselect it as the art source (badge: “source: <title>”); the art
  source dropdown also lists `/api/designs`.

## Wiring & scripts
- **`package.json`** (devDependencies): `express`, `@types/express`, `vite`, `react`,
  `react-dom`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`. Scripts:
  `admin:server` (`tsx admin/server/index.ts`), `admin:web` (`vite`),
  `admin:build` (`vite build`), `admin` (server + web; dev proxy handles `/api`).
- **`Makefile`** — `admin:` target → `npm run admin` (prints both URLs; reuses `.env` /
  `PROVIDER` exactly like the CLIs). Note: needs `ANTHROPIC_API_KEY` for the `claude`
  provider, or pick `claude-code`.
- **`tsconfig`** — include `admin/server`; the web app uses its own Vite/React TS config so
  DOM types don't leak into the Node-typed core.
- **Isolation:** core `src/` gains nothing but the optional `modelOverride`; all server/UI
  code stays under `admin/`.

## Files
**New (backend):** `admin/server/index.ts`, `admin/server/runs.ts`, `admin/server/observer.ts`, `admin/server/bus.ts`.
**New (frontend):** `admin/web/index.html`, `admin/web/vite.config.ts`, `admin/web/src/main.tsx`, `admin/web/src/App.tsx`, `admin/web/src/lib/{api,sprite}.ts`, `admin/web/src/components/{PhasePanel,ModelSelect,ProgressBar,LogView,DesignPreview,ArtPreview}.tsx`, styles.
**Modified:** `src/design/runDesignPhase.ts` + `src/art/runArtPhase.ts` (optional `modelOverride`), `src/llm/selectProvider.ts` (accept a provider name arg), `package.json`, `Makefile`, `tsconfig.json`.
**Untouched:** all contracts, `defineChain`, `Observer`/`ProgressTracker` (consumed as-is), the compiler, every existing CLI.

## TDD
Core change is test-first per the factory rules; the UI is covered lightly.
- **Backend (Vitest, MockProvider — zero network):** inject `fromMap(...)` design/art
  fixtures via the run functions; assert `/api/run/design` returns a traceId and the stream
  ends in a `done` whose `artifact` is a contract-valid `GameDefinition`, with ≥1 `progress`
  and ≥1 `log` (carrying `costUsd`) in between. Same for art → `SpritePack`. Assert
  `modelOverride` reaches the chains (tier `opus` ⇒ every `llm_call` logs the Opus model).
- **Contract regression:** existing tiers 1–3 stay green (the `modelOverride` addition is
  optional, so `runDesignPhase`/`runArtPhase` tests are unchanged).
- **Frontend (Vitest + jsdom):** unit-test `drawSprite` (mask → expected canvas pixels)
  and `DesignPreview` (renders every field, no `[object Object]`). No e2e browser harness.

## Verification
1. `npm run typecheck` && `npm run lint` clean (core + `admin/server`).
2. `npm test` — backend stream test green, existing tiers 1–3 green.
3. `make admin`, open the web URL: run **Design** (provider `claude`, tier `default`) →
   progress fills, logs stream, a formatted summary + cost appear.
4. Click **Run Art** on that design → sprites render to canvas per entity, cost shown;
   confirm a `runs/<traceId>/trace.json` was written for each.
5. Switch the art source to a batch-cache entry and re-run → renders from the cache.
6. Cheap path: provider `claude-code` to validate end-to-end via the subscription.

## Risks
- **Live signal via the log stream**: derives logs/cost from pino JSON lines — keep the
  bus stream at `debug` so `node_start` is captured; pretty-print stays on stdout
  separately. If a log field is renamed in core, the adapter (one file) updates with it.
- **New dependencies**: Express/Vite/React are dev-only and confined to `admin/`; the
  shipped factory and its CLIs gain none. Call this out so the no-deps rule isn't read as
  violated.
- **Model tier vs tuned tiering**: forcing `sonnet` everywhere can dent design novelty
  (creative/critic are Opus by design). The selector defaults to `default`; the tiers are
  an explicit operator override, labelled as such.
- **Concurrent runs**: keyed by `traceId`, so multiple are fine; the in-memory design-run
  map and bus registry get a TTL so long sessions don't leak.
- **No auth / localhost only**: it triggers billable LLM calls — bind to `127.0.0.1` and
  document that it must not be exposed.
