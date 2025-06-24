# Modular Agent Chains Directory

This directory will contain modular agent chain/tool implementations and the main pipeline composition for the new architecture.

- Add each agent as a separate module (e.g., GameInventorChain.js, GameDesignChain.js, etc).
- Compose the pipeline in a dedicated file (e.g., pipeline.js).

Start with test-driven development: see `server/tests/e2e/GamePipelineLangChain.e2e.test.js` for the initial E2E test.
