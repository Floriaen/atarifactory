# Plan: Full Pipeline Mock Mode

## Goal
Enable a mode where the entire game generation pipeline is bypassed, and static, working game artifacts are injected directly. This allows for fast, robust end-to-end testing of the infrastructure, file serving, and frontend integration.

---

## How to Enable Mock Mode

- **Recommended:** Use an environment variable when launching the server:

  ```sh
  MOCK_PIPELINE=1 npm run start:server
  ```

- The server should check for `process.env.MOCK_PIPELINE` and activate mock mode if set.

---

## Steps

1. **Designate a Mock Mode**
   - Add a configuration flag (e.g., `MOCK_PIPELINE=1` or `config.mockPipeline = true`).

2. **Prepare Mock Artifacts**
   - Store a known-good `game.js` and `index.html` (and any other required files) in a `mocks/` or `fixtures/` directory.

3. **Bypass Pipeline Logic**
   - When mock mode is enabled, skip all agent execution and LLM calls.
   - Directly copy the mock artifacts to the output game directory (e.g., `server/games/<gameId>/`).

4. **Serve Mock Game**
   - Ensure the server and frontend load and display the mock game as if it were generated by the real pipeline.

5. **Logging and Visibility**
   - Log clearly when mock mode is active.
   - Optionally, display a banner or message in the frontend indicating mock mode.

6. **Testing**
   - Add end-to-end tests that run with mock mode enabled to verify infrastructure, file serving, and frontend integration.

7. **Extensibility**
   - Optionally, allow for per-agent or per-step mocking in the future.

---

## Benefits

- Fast, deterministic, and robust end-to-end testing.
- Isolates infrastructure and integration from agent/LLM logic.
- Ideal for CI/CD and regression testing. 