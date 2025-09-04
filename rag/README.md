## RAG Workspace

A self-contained, development-only module that indexes this repository's docs and source code for fast local search via BM25. It runs an independent HTTP server with a minimal web UI and provides CLI utilities for indexing and querying.

### Features

- Local indexing (BM25) of `docs/`, `server/`, `frontend/`, and root `README.md`
- Independent Express server with REST API: reindex and query
- Minimal web UI served from the same server (no build tool required)
- CLI scripts for quick indexing and queries
- No external services or API keys required

### Quick Start

1) Install (from repo root):

```bash
npm install
```

2) Build the index:

```bash
npm run rag:index
```

3) Start the RAG server + UI:

```bash
npm run start:rag
# Opens http://localhost:4001
```

4) Use the UI

- Visit `http://localhost:4001`
- Enter a query (e.g., "PipelineStatus phase shape") and click Search
- Click "Reindex" after you change docs/code

### HTTP API

- GET `/api/health`
  - Returns basic server status and whether the index file exists
- POST `/api/reindex`
  - Rebuilds the index. Response: `{ ok: true }` on success
- POST `/api/query`
  - Body: `{ "q": "your query", "k": 5 }`
  - Response: `{ ok: true, totalChunks, results: [{ file, startLine, text, score }] }`

Server port can be customized via `RAG_PORT` (default `4001`).

### CLI Usage

From repo root (delegates to the `rag` workspace):

```bash
npm run rag:index
npm run rag:query -- "progress pipeline status events"
```

From the `rag/` directory directly:

```bash
node src/indexer.js
node src/search.js "your query"
```

### Assistant Usage Modes

This repo includes a simple toggle to guide how an AI assistant uses RAG locally:

- `ask-first` (default): Assistant asks before running RAG queries.
- `auto`: Assistant may run RAG queries on-demand when helpful and will summarize results in responses.

Set the mode (inside `rag/`):

```bash
npm run mode:status         # Show current mode
npm run mode:auto           # Enable auto on-demand
npm run mode:ask            # Enable ask-first
```

The mode is stored at `/.assistant-mode` (repo root). To set a shared default, copy `.assistant-mode.example` to `.assistant-mode` at the repo root.

### Index Scope and Storage

- Included: `docs/`, `server/`, `frontend/`, `README.md`, `CLAUDE.md`
- Excluded: `node_modules/`, `.git/`, `rag/` (to avoid self-indexing)
- Output: `rag/knowledge/index.json` (git-ignored)

### Project Structure

```
rag/
  public/           # Static UI (no framework)
    index.html
    main.js
    style.css
  src/
    server.js       # Express server + static UI
    indexer.js      # Builds BM25 index
    search.js       # Query BM25 index (CLI and lib)
  package.json
  README.md
```

### Notes

- This module is independent from the factory app. It is not mounted into the main server and should be treated as dev tooling.
- Re-run reindex after non-trivial doc/code changes to refresh results.
- BM25 scoring is lightweight and fast; for hybrid search or embedding rerank, you can extend `search.js` to include an optional reranker behind an env flag.

### License

Inherits the repository's license and contribution guidelines.
