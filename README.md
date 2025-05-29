# Atari-like Game Factory

A minimal autonomous pipeline to generate and play simple Atari-style games using Node.js, Express, and **vanilla JavaScript Canvas** (no frameworks).

## Setup Instructions

### 1. Create a `.env` file

Create a file named `.env` in the project root with the following content:

```
OPENAI_API_KEY=your-openai-api-key-here
```

Replace `your-openai-api-key-here` with your actual OpenAI API key.

### 2. Install dependencies (from the project root):

```sh
npm install
```

### 3. Start the backend:

```sh
node server.js
```

### 4. Start the frontend (in a new terminal):

```sh
cd frontend
npm install
npm run dev
```

### 5. Open the frontend in your browser (usually at http://localhost:5173)

---

- Generated games are saved in the `/games/` directory.
- No secrets or API keys are tracked in this repo. 