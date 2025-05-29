# Atari-like Game Factory

A minimal autonomous pipeline to generate and play simple Atari-style games using Node.js, Express, and Phaser 3.

## Setup

1. Install dependencies (from the project root):
   ```sh
   npm install
   cd frontend && npm install
   ```

2. Start the backend:
   ```sh
   node server.js
   ```

3. Start the frontend (in a new terminal):
   ```sh
   cd frontend
   npm run dev
   ```

4. Open the frontend in your browser (usually at http://localhost:5173)

---

- Generated games are saved in the `/games/` directory.
- No secrets or API keys are tracked in this repo. 