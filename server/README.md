# Game Agent Server

This directory contains the backend (Node.js + Express) for the Atari-like Game Factory project.

## Setup

1. Copy `.env` to this directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   npm run dev
   # or
   npm start
   ```

## Files
- `index.js` — main server entry point
- `llm_game_prompt.txt` — prompt template for LLM game generation
- `games/` — generated games
- `logs/` — logs 