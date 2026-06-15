# Plan — Decouple the admin from the pipeline (REST + stateless)

## Objective
Sever the in-process link between the **admin** and the **factory (pipeline)**. After this:

1. **Not connected** — the admin shares **no code** with the pipeline except one tiny
   *contracts* package (the wire shapes). No `import … from '../../src/…'` anywhere under
   `admin/`.
2. **Pipeline exposes a full REST API** — the factory ships an HTTP service; the admin is
   a pure **client** of that API.
3. **Pipeline is stateless; the admin owns all state** — no run store, no caches, no
   session registries, no replay buffers in the pipeline. Same request in → same behaviour
   out, horizontally scalable. The admin holds the cache, registries, persistence, and
   replay.

This is the consumer-boundary rule ([consumer-boundary.md](./consumer-boundary.md)) taken
to its conclusion: today the admin honours it *in spirit* (imports only `src/api.ts`) but
still links the factory **in-process**. We replace that link with HTTP.

---

## Current state (the coupling)

```
admin/web (React :5173) ──/api──► admin/server (Express :8787) ──in-process import──► src/api.ts (phases)
                                         │  RunStore → runs/<id>/trace.json
                                         │  Map<traceId> designs/arts/results
                                         │  runs/cache + on-disk trace resolution
                                         └  RunBus replay registry
```

The **web is already decoupled** — it mirrors the contracts in
[admin/web/src/lib/types.ts](factory/admin/web/src/lib/types.ts) and speaks only HTTP/SSE.
**All coupling lives in `admin/server/`:**

| File | `src/` imports today | Nature |
|---|---|---|
| [runs.ts](factory/admin/server/runs.ts) | `runDesignPhase`, `runArtPhase`, `runCodePhase`, `createRunContext`, `DEFAULT/OPUS/SONNET_MODEL`, types | **runs phases in-process** |
| [observer.ts](factory/admin/server/observer.ts) | `Observer`, `RunStore`, `UsageAggregator`, `withTrace` | builds the in-process observer + persistence |
| [index.ts](factory/admin/server/index.ts) | `selectProvider`, `parseGameDefinition`, `parseSpritePack`, `OPUS/SONNET_MODEL`, `createLogger`, types | route layer + provider/model |
| [bus.ts](factory/admin/server/bus.ts) | `FactoryEvent` type | replay bus |

State that must leave the pipeline path: `RunStore` persistence, the `designs/arts/results`
maps, `runs/cache/design-games.json`, on-disk trace resolution (`readArtTrace`/`readTraceGame`),
and the `RunBus` registry.

---

## Target architecture

Three components, one new (the **pipeline service**):

```
┌─ factory core (src/) ────────── the library: phases, llm, observability, contracts (src/api.ts)
│
├─ pipeline service (NEW)   a thin STATELESS host over src/api.ts. Exposes REST + streaming.
│      bin/serve.ts · server/…        imports phases in-process (this is the factory's public face)
│            ▲ REST + NDJSON stream
│
└─ admin/  ── consumer ──────────  server/ = BFF: cache · registries · persistence · replay bus
       web/ (React) ──/api──► server/ (Express)  ──HTTP──►  pipeline service
                                   imports ONLY @game-factory/contracts; never src/ phases
```

- **The pipeline service is just another host over `src/api.ts`** — like the CLIs. No factory
  logic is duplicated; the service is a thin HTTP shell. (Decision: **admin-only** decoupling —
  the CLIs in `bin/` stay in-process library hosts.)
- **The admin is client #1 of N, not "the" client.** The pipeline is consumed by at least one
  other client beyond the admin, so the REST surface is a **real public contract** — HTTP is
  chosen deliberately as a hard process boundary, not for convenience. Consequences: nothing
  admin-shaped may leak into the API; `/v1` versioning + a stable error model + a published
  schema are mandatory, not optional.
- **The admin orchestrates the sequence** (design→art→code, off which source). The pipeline
  runs **one phase per request** and forgets it. The only intra-request chaining is `code`
  running `art` inline when no `pack` is supplied — a within-phase convenience, kept in the
  pipeline so "design → playable" is one call/one stream.

---

## The pipeline REST API (stateless)

Versioned under `/v1`. Streaming hop is **NDJSON** (`application/x-ndjson`, one JSON event
per line) — trivially read by the admin's `fetch` stream reader; no `EventSource` needed
server-to-server. (The admin→browser hop stays SSE.)

| Method | Path | Body | Response |
|---|---|---|---|
| `GET`  | `/health` | — | `{ ok: true }` |
| `GET`  | `/v1/models` | — | `{ providers, tiers }` (from `models.ts`; moves off the admin) |
| `POST` | `/v1/design` | `{ provider?, modelTier?, numSeeds? }` | NDJSON stream → terminal `done` `{ artifact: GameDefinition, usage }` |
| `POST` | `/v1/art` | `{ provider?, modelTier?, game }` | NDJSON stream → `done` `{ artifact: SpritePack, usage }` |
| `POST` | `/v1/code` | `{ provider?, modelTier?, game, pack? }` | NDJSON stream → `done` `{ artifact: { report, bundle }, usage }` |

**Stream vocabulary** (one shape, defined once in the contracts package): the factory's
`FactoryEvent`s (`node_start` / `node_end` / `node_error` / `llm_call` / `progress`)
forwarded verbatim, terminated by a service-minted `done` or `error`. The pipeline mints
the terminal `done` (it produces the artifact) — today the admin mints it; this moves to
where the artifact is born.

**What makes it stateless**
- Every input is in the request body (art carries the full `GameDefinition`, code carries
  `game` + optional `pack`). No `traceId`-keyed lookups, no disk reads of prior runs.
- **No `RunStore`** — the service does not pass one to the `Observer`; it writes nothing to
  `runs/`. The artifact is returned in the `done` event; the admin persists it.
- **No registries / no replay bus** — the run streams inline for the life of one HTTP
  response. If the connection drops, the run aborts (see *abort-on-disconnect* below); there
  is nothing to "reconnect" to. Replay is the admin's job.
- Provider/model selection stays **in** the pipeline (it's "which backend runs"):
  `selectProvider(provider)` and `tierToOverride(modelTier)` move into the service.
- An optional `x-run-id` header (admin-minted) is echoed into the service's `RunContext` for
  log correlation only — stored nowhere.

**Errors** — Zod-validate the body at the edge → `400 { error }` on a bad/contract-invalid
input *before* streaming starts. A failure mid-run surfaces as a terminal `error` event (the
stream already has a `200`). `5xx` only for the service itself failing to start a run.

---

## What moves where

| Capability | Today | After |
|---|---|---|
| Run a phase | admin `runs.ts` (in-process) | **pipeline service** `POST /v1/{design,art,code}` |
| Provider/tier → override | admin `index.ts` / `runs.ts` | **pipeline service** |
| Model metadata (`/models`) | admin `index.ts` (imports `*_MODEL`) | **pipeline service** `GET /v1/models`; admin proxies |
| Build `Observer` + sink | admin `observer.ts` | **pipeline service** (sink → NDJSON response) |
| `RunStore` persistence | admin via `store.finalize` | **admin** `store.ts` (writes `runs/<id>/trace.json` + `game/`) |
| Session registries (`designs/arts/results`) | admin `runs.ts` | **admin** (unchanged location) |
| Cache (`runs/cache/design-games.json`) | admin `index.ts` | **admin** (unchanged) |
| On-disk source resolution | admin `index.ts` | **admin** (unchanged) |
| Replay bus | admin `bus.ts` | **admin** (unchanged; type from contracts) |
| Run identity | pipeline `createRunContext` | **admin** mints run-id; passes `x-run-id` |

Net: the pipeline path *loses* all persistence/registry/replay; the admin keeps everything it
already had **plus** persistence (writes the artifact itself instead of `RunStore` doing it).

---

## Shared contracts package

Extract `src/contracts/**` + the stream-event type into a standalone package
`@game-factory/contracts` (npm workspace), containing **only Zod schemas + types + parse
guards** — zero phases/llm/observability, dep only on `zod/v4`.

- `src/` re-exports it through `api.ts` (no behavioural change to the core).
- The **pipeline service** imports it to validate bodies and type artifacts.
- The **admin server** imports it for `parseGameDefinition` / `parseSpritePack` at its *read*
  boundary (loading cache/disk) and to type API responses. This replaces the admin's `src/`
  imports of `GameDefinition`/`SpritePack`/parse guards.
- `admin/web/src/lib/types.ts` can keep its hand-mirrored types **or** import the package
  (web build permitting) — separate, low-priority cleanup.

Move `FactoryEvent` (+ the `done`/`error` terminal) into the package as the canonical
**stream protocol** so both sides agree on the wire shape in one place.

> Decision flagged: this shared package is the recommended path (keeps the repo's DRY
> "one versioned contract" rule and gives the admin compile-time safety). The alternative —
> admin treats responses as opaque JSON / its own DTOs — drops the dependency entirely at the
> cost of duplicated schema knowledge. Flip here if "not connected" must mean *zero* shared code.

---

## Boundary enforcement

Add `no-restricted-imports` (eslint) so the boundary can't silently regress:

- `admin/**` may **not** import `../src/**`, `../server/**` (pipeline), or `@anthropic-ai/**`.
  Allowed: `@game-factory/contracts`.
- `src/**` and `server/**` may **not** import `admin/**` (the existing core rule).

This is the lint rule the original admin-interface plan called out as a risk but never landed.

---

## Config & run topology

Two processes now (three in dev, with Vite):

- **Pipeline service** — `PORT` (e.g. `8910`), needs `ANTHROPIC_API_KEY` (or `PROVIDER=claude-code`).
- **Admin server** — `ADMIN_PORT` (8787) + `PIPELINE_URL` (e.g. `http://127.0.0.1:8910`).
  Needs **no** API key — it never calls Claude; it calls the pipeline.
- `package.json` scripts: `serve` (`tsx bin/serve.ts`), and `admin` now starts **three**:
  pipeline service + admin server + Vite.
- `Makefile` `admin:` target updated to launch the pipeline service alongside; new `serve:`
  target for the pipeline alone. The `.env`/`PROVIDER` handling moves to the **service**.
- Localhost-bind both; optional shared bearer token (`PIPELINE_TOKEN`) between admin and
  pipeline since the pipeline triggers billable calls.

---

## Additional improvements (toward the same objective)

- **Abort-on-disconnect** — a stateless service must not keep spending on an abandoned run.
  Thread an `AbortSignal` (from the HTTP request `close`) through the phase → provider so a
  dropped admin connection cancels the LLM calls. (New, generic seam on the phase deps — useful
  to any host; export from `api.ts`.)
- **One protocol definition** — the NDJSON event union lives once in the contracts package; the
  admin's `bus.ts` `TerminalEvent` and `web/lib/types.ts` `StreamEvent` both reference it,
  killing the current triple-definition drift.
- **OpenAPI/JSON-Schema doc (required — second client)** — publish the API schema from the Zod
  contracts (`z.toJSONSchema`) at `GET /v1/openapi.json`. The shared package types the **TS**
  admin; a **non-TS** client can't import Zod, so this generated schema is the cross-language
  source of truth (one Zod definition → two delivery formats: the package and the schema). It
  also makes the API self-describing.
- **Health/readiness** — `GET /health` for the admin to surface "pipeline up/down" instead of
  failing a run cold.
- **Run-id correlation** — admin mints the id (it owns the registry); `x-run-id` flows down for
  log alignment across both processes.

---

## Migration (incremental, test-first — each step ships green)

1. **Extract `@game-factory/contracts`** (workspace). Move `src/contracts/**` + `FactoryEvent`/
   terminal-event types; `api.ts` re-exports. Tiers 1–3 stay green. *(no behaviour change)*
2. **Stand up the pipeline service** over `api.ts`: `bin/serve.ts` + `server/{index,run}.ts`,
   the 3 phase routes + `/v1/models` + `/health`, NDJSON streaming, body validation, terminal
   `done`/`error`, abort-on-disconnect. **Test first** (supertest + MockProvider): bad body →
   400; good body → stream ends in `done` with a contract-valid artifact, ≥1 `progress` and
   ≥1 `llm_call` (with `costUsd`) between; tier `opus` ⇒ every `llm_call` logs the Opus model.
3. **Rewrite `admin/server` as a REST client.** `runs.ts` → calls the pipeline over HTTP,
   relays NDJSON into the existing `RunBus`, persists the `done` artifact via a new admin
   `store.ts`, updates the `designs/arts/results` registries. Delete `observer.ts`. `index.ts`
   drops `selectProvider`/model/`createLogger` imports; `/api/models` proxies the pipeline.
   **Test first** with the pipeline **mocked over HTTP** (msw/nock) — proving the admin no
   longer imports phases.
4. **Land the lint boundary rule**; remove every `src/` import from `admin/**`. CI fails if one
   returns.
5. **Wiring**: `package.json` scripts, `Makefile` (`serve:` + 3-process `admin:`), `.env`
   ownership → service, `PIPELINE_URL` → admin. Update [admin-interface.md](./admin-interface.md)
   and [consumer-boundary.md](./consumer-boundary.md) (the boundary is now a *network* boundary).

### Files
- **New:** `contracts/` package; `bin/serve.ts`; `factory/server/{index,run}.ts`;
  `admin/server/store.ts`; admin REST-client module.
- **Modified:** `admin/server/{index,runs,bus}.ts`, `package.json`, `Makefile`, `eslint.config.js`,
  `tsconfig`, the two docs.
- **Deleted:** `admin/server/observer.ts`.
- **Untouched:** `src/` phases/llm/observability (only `contracts` lifts out + `api.ts`
  re-export), all CLIs, `admin/web/**` (already HTTP-only).

---

## Settled
- **Pipeline has ≥2 clients** (the admin + at least one other). HTTP is the deliberate hard
  boundary; the REST surface is a public, versioned contract. This locks the decisions below.
- **Contracts**: shared `@game-factory/contracts` package for TS clients **+** an OpenAPI schema
  generated from the same Zod contracts for non-TS clients. (Opaque-JSON-per-client is rejected —
  it duplicates the schema once per consumer.)
- **Scope**: admin-only in-process decoupling — the CLIs in `bin/` stay library hosts; the second
  client talks REST like the admin.
- **Auth**: `PIPELINE_TOKEN` bearer expected (multiple clients on a billable service), not optional.

## Open decisions
1. **Stream transport**: NDJSON pipeline→client *(recommended)* vs SSE end-to-end. Minor; NDJSON
   is simpler server-to-server. (The admin→browser hop stays SSE regardless.)
