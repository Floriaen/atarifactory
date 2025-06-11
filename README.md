## Architecture Principles

This project follows CLEAN architecture principles:

- Business logic (agents, pipeline) is decoupled from frameworks and infrastructure.
- All dependencies (LLM clients, loggers, etc.) are injected, not hardcoded.
- Controllers/orchestrators handle I/O and dependency wiring.
- Tests use mocks and dependency injection for fast, reliable feedback.
- Code is organized for modularity, testability, and future-proofing.
- **Single Responsibility:** Each module/agent does one thing and does it well.

All contributors and tools must follow these guidelines.

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

- Tests are located in the `server/tests` directory and are intended for the server code only.

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