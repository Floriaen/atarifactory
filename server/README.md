# pipeline-v2

This directory contains the next-generation, agent-based, LLM-driven game generation pipeline. It is developed incrementally according to the specifications in `docs/game-generation-specifications.md` and the iterative development plan in `docs/pipeline-iterative-development-plan.md`.

- All agents are modular and stateless.
- Utilities and tests are colocated for clarity and maintainability.
- This pipeline is developed in isolation from legacy code for clean, incremental progress.

---

## Environment Variables

- `OPENAI_API_KEY`: Required to use the real OpenAI LLM pipeline.
- `MOCK_PIPELINE`: If set to `1`, runs the pipeline in mock mode using static mock game code (bypasses LLM calls).
- `MINIMAL_GAME`: If set to `1`, runs the pipeline with a hardcoded minimal game prompt for testing. This generates a very simple game (player moves left/right, wins by reaching the right edge, no coins, no spikes, no score). Useful for fast/small test runs or debugging. When unset or `0`, the normal prompt/title is used.

### Usage

To run the pipeline with a minimal game for testing:

```sh
MINIMAL_GAME=1 npm start
```

You can combine this with other environment variables as needed. Only one special mode (MOCK or MINIMAL) will be active at a time.

## Mock Pipeline Mode

You can run the pipeline in a fast, robust mock mode for end-to-end testing and development.

- **Enable mock mode:**
  ```sh
  MOCK_PIPELINE=1 npm run start:server
  ```
- In mock mode, the pipeline skips all agent/LLM logic and uses the static mock game code from `server/mocks/game.js`.
- All generated files (`game.js`, `gameBoilerplate/controlBar/controlBar.js`, `gameBoilerplate/controlBar/controlBar.css`, `index.html`) are written directly into `/server/games/<gameId>/` (no `assets/` directory).
- The frontend and server behave as if a real game was generated, allowing you to test serving, loading, and playing the game.

## Integration Testing

- There is an integration test for the mock pipeline: `server/tests/integration/mockPipeline.test.js`
- This test verifies that all expected files are generated and that the mock game code is used.

---
