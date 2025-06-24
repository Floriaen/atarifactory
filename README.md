![CI](https://github.com/Floriaen/atarifactory/actions/workflows/ci.yml/badge.svg)

## Architecture Principles

This project follows CLEAN architecture principles:

- Business logic (agents, pipeline) is decoupled from frameworks and infrastructure.
- All dependencies (LLM clients, loggers, etc.) are injected, not hardcoded.
- Controllers/orchestrators handle I/O and dependency wiring.
- Tests use mocks and dependency injection for fast, reliable feedback.
- Code is organized for modularity, testability, and future-proofing.
- **Single Responsibility:** Each module/agent does one thing and does it well.

All contributors and tools must follow these guidelines.

---

## Pipeline-v3 Architecture (Langchain-based)

> **Deprecation Notice:** All pre-v3 pipelines and legacy agent-based flows are deprecated. Only pipeline-v3 (Langchain-based) is supported and maintained. See [docs/pipeline-v3-design.md](docs/pipeline-v3-design.md) for full details.

> **Directory Structure Update:** All design/planning chains are now located in `server/agents/langchain/chains/design/`. Import and extend only from this directory for new features.


> **Note:** Only pipeline-v3 is maintained and supported. All previous pipelines are deprecated. The pipeline is implemented using modular [Langchain](https://js.langchain.com/) chains for each step.

### High-Level Pipeline Flow

```
GameInventorChain
      ↓
GameDesignChain
      ↓
PlannerChain
      ↓
ContextStepBuilderChain (×N)
      ↓
StaticCheckerChain
      ↓
SyntaxSanityChain
      ↓
RuntimePlayabilityChain
      ↓
FeedbackChain
```

### Chain Roles
- **GameInventorChain:** Generates a new game idea (`name`, `description`).
- **GameDesignChain:** Designs mechanics, entities, and win condition for the idea (see `chains/design/GameDesignChain.js`).
- **PlannerChain:** Breaks down the design into an ordered plan of implementation steps.
- **ContextStepBuilderChain:** Iteratively implements each plan step, always working with the full game source code.
- **StaticCheckerChain:** Lints and checks for forbidden patterns or errors.
- **SyntaxSanityChain:** Ensures generated code is syntactically valid.
- **RuntimePlayabilityChain:** Runs the game in a headless browser to check for playability.
- **FeedbackChain:** Provides suggestions or triggers retries if issues are detected.

> **Naming Update:** All new chains follow the `XChain` naming convention (e.g., `GameDesignChain`, not `GameDesignAgent`).

**Langchain** is a core dependency for pipeline composition, prompt templating, and LLM orchestration.

For detailed architecture, see [docs/pipeline-v3-design.md](docs/pipeline-v3-design.md).

## Extending the Pipeline

To add or modify pipeline steps, create or update the corresponding Langchain chain module in `server/agents/langchain/chains/design/` (for design/planning) or `server/agents/langchain/chains/` (for other steps). Follow the contract and TDD approach described in `docs/design-planning-improvement - SPECS.md`.

All new chains should:
- Export both the chain object and a `createXChain` factory function for testability.
- Be covered by unit and integration tests in `server/tests/unit/design/`.
- Follow the modular, single-responsibility pattern.


**Extensibility:**
- To add or modify pipeline steps, create or update the corresponding Langchain chain module in `server/agents/langchain/chains/`.
- See the [Langchain JS documentation](https://js.langchain.com/) for best practices.

## Linting

To check code style and errors, run:

    npx eslint 'server/**/*.js'

To auto-fix issues:

    npx eslint 'server/**/*.js' --fix 

## LLM Client & Dependency Injection Guidelines

To ensure robust, testable, and maintainable LLM integration, follow these rules:

- **LLM Client Instantiation:**
  - The LLM client (SmartOpenAI or MockSmartOpenAI) must be instantiated only in the controller or dependency injection (DI) layer.
  - No agent or pipeline should ever instantiate or import OpenAI/SmartOpenAI directly.

- **Dependency Injection:**
  - All agents that use LLMs must receive `llmClient` as a constructor argument (or via a clear factory function).
  - Tests and production code must both use the same mechanism to inject the client.

- **Mocking & Testing:**
  - The mock (MockSmartOpenAI) must be kept in sync with the real SmartOpenAI's interface.
  - Tests should always use the mock by default, and only use the real client if explicitly configured.

- **Controller/Endpoint Consistency:**
  - The Express endpoint (or any entry point) must always instantiate the pipeline with the correct `llmClient` (real or mock, depending on config).
  - No agent should ever "fall back" to a mock internally—this should be handled at the controller/DI level.

- **Forbidden Patterns:**
  - Agents must never import or instantiate OpenAI/SmartOpenAI directly.
  - All LLM output extraction and parsing must be handled in SmartOpenAI, not in individual agents.

- **Logging:**
  - Each agent should log which LLM client it is using (for debugging).
  - The pipeline should log the traceId and LLM client type at the start of each run.

**All contributors must read and follow these guidelines.**

## Running the Server

- Navigate to the `server` directory:

  ```bash
  cd server
  ```

- Start the server:

  ```bash
  node index.js
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run start:server
  ```

## Running Tests

- Tests are located in the `server/tests` directory. Design/planning chain tests are in `server/tests/unit/design/`.

- To run tests, navigate to the `server` directory and run:

  ```bash
  npm test
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run test:server
  ```

- The Jest configuration is located in the `server` directory and loads environment variables from `server/.env`.

- End-to-end tests (`e2e`) are currently excluded from the default test runs.

> **All tests currently pass. The codebase is ready for production testing.**

## Running the Frontend

- Navigate to the `frontend` directory:

  ```bash
  cd frontend
  ```

- Install dependencies if not already done:

  ```bash
  npm install
  ```

- Start the frontend development server:

  ```bash
  npm run dev
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run start:frontend
  ```

## Environment Variables

- Environment variables for the server are stored in `server/.env`.

- Ensure to set `OPENAI_API_KEY` in `server/.env` for tests and server functionality that require it.


## Monorepo Dependency & Script Structure

| Type                         | Where to Declare?                | Examples                                               | Notes                                      |
|------------------------------|-----------------------------------|--------------------------------------------------------|---------------------------------------------|
| **Backend dependencies**     | root `package.json`               | `express`, `langchain`, `@langchain/openai`, `cors`    | Only used by backend/server code            |
| **Backend devDependencies**  | root `package.json`               | `jest`, `eslint`, `nodemon`                            | Backend test/lint/dev tools                 |
| **Backend scripts**          | root `package.json`               | `start`, `dev:server`, `test:unit`                     | All backend scripts run from root           |
| **Frontend dependencies**    | `frontend/package.json`           | `react`, `react-dom`, `vue`, `svelte`, `axios`         | Only used by frontend code                  |
| **Frontend devDependencies** | `frontend/package.json`           | `vite`, `tailwindcss`, `@vitejs/plugin-react`          | Frontend build/test/dev tools               |
| **Frontend scripts**         | `frontend/package.json`           | `dev`, `build`, `preview`                              | Run with `npm run` in `frontend/`           |
| **Frontend root script**     | root `package.json`               | `start:frontend`                                       | Convenience: `npm run start:frontend`       |
| **Shared tooling**           | root `package.json`               | `eslint`, `prettier`                                   | If used by both frontend and backend        |

**Summary:**
- Backend: All dependencies, devDependencies, and scripts in root.
- Frontend: All dependencies, devDependencies, and scripts in `frontend/package.json`.
- Shared tooling: Hoist to root if used by both frontend and backend.
- Avoid duplicating dependencies across root and workspace `package.json` files.


## UI Token Counting (Planned)

A token counter feature is planned for the UI to estimate the cost of current generation. This will use the `tokenCount` field in the shared state, populated by the pipeline for each run (see `GameDesignChain` and downstream chains).

## Test Logging Mechanism

By default, all agent tests suppress logs for clean test output. To enable logs (for debugging, LLM prompt inspection, etc.), run your tests with:

    TEST_LOGS=1 npx jest

This will print all agent logs to the terminal. This mechanism is implemented in every agent test file.

## Test Modes: Mock vs. Real LLM

By default, all tests use fast, deterministic mocks for LLM calls.

- To enable logs: set TEST_LOGS=1
- To run tests with the real LLM: set both TEST_LLM=1 and OPENAI_API_KEY=your-key

Example commands:

- Mock only: `npx jest`
- Mock + logs: `TEST_LOGS=1 npx jest`
- Real LLM + logs: `TEST_LLM=1 OPENAI_API_KEY=sk-... TEST_LOGS=1 npx jest`
- Real LLM only: `TEST_LLM=1 OPENAI_API_KEY=sk-... npx jest`

| Mode         | Env Vars Needed         | LLM Used         | Logs      | Command Example                                      |
|--------------|------------------------|------------------|-----------|------------------------------------------------------|
| Mock only    | (none)                 | MockSmartOpenAI  | Off       | npx jest                                             |
| Mock + logs  | TEST_LOGS=1            | MockSmartOpenAI  | Console   | TEST_LOGS=1 npx jest                                 |
| Real LLM     | TEST_LLM=1 + OPENAI_API_KEY | SmartOpenAI      | Off       | TEST_LLM=1 OPENAI_API_KEY=sk-... npx jest            |
| Real LLM+Log | TEST_LLM=1 + OPENAI_API_KEY + TEST_LOGS=1 | SmartOpenAI | Console   | TEST_LLM=1 OPENAI_API_KEY=sk-... TEST_LOGS=1 npx jest | 

## Summary

- Server and tests are isolated in the `server` directory.
- Frontend is isolated in the `frontend` directory.
- Root directory scripts provide convenient commands to run server, tests, and frontend.
- Jest configuration and environment loading are handled within the `server` directory.

This setup ensures clear separation of concerns and consistent workflows.