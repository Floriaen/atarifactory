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

## Test Logging Mechanism

By default, all agent tests suppress logs for clean test output. To enable logs (for debugging, LLM prompt inspection, etc.), run your tests with:

    TEST_LOGS=1 npx jest

This will print all agent logs to the terminal. This mechanism is implemented in every agent test file. 