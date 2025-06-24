const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// ensure env is loaded even when index.js is executed directly (tests) 
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Legacy imports removed after refactor. Core pipeline lives in controller.js
const { runPipeline } = require('./controller');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));

// Dummy in-memory games list for MVP skeleton
global.gamesManifest = [];

const GAMES_DIR = path.join(__dirname, 'games');
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure /games/ directory exists
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR);
}

// Ensure /logs/ directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// --- SSE /generate-stream endpoint ---
app.post('/generate-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  function safeStringify(val) {
    if (typeof val === 'string') return val;
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  function sendStep(step, data = {}) {
    // Only stringify nested objects except for 'game', which stays as object
    const payload = { step };
    for (const [k, v] of Object.entries(data)) {
      if (k === 'game') {
        payload[k] = v; // keep as object
      } else if (typeof v === 'object' && v !== null) {
        payload[k] = safeStringify(v);
      } else {
        payload[k] = v;
      }
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
  // If no title, generate a random one
  let title = req.body && req.body.title;
  if (!title) {
    title = 'Game-' + uuidv4().slice(0, 8);
  }
  try {
    await runPipeline(title, (step, data) => sendStep(step, data));
    res.end();
  } catch (err) {
    console.error('Error in /generate-stream:', err);
    sendStep('Error', { error: err.message });
    res.end();
  }
});

// GET /games - list all games
app.get('/games', (req, res) => {
  res.json(global.gamesManifest);
});

// Log all /games/* requests for debugging
app.use('/games', (req, res, next) => {
  console.log(`[DEBUG] Incoming /games request: ${req.method} ${req.originalUrl}`);
  next();
});

// Serve any asset inside a game's directory (e.g. /games/:id/assets/game.js)
app.get('/games/:id/assets/:filename', (req, res) => {
  const gameId = req.params.id;
  const filename = req.params.filename;
  const gameFolder = path.join(GAMES_DIR, gameId, 'assets');
  const filePath = path.join(gameFolder, filename);
  if (fs.existsSync(filePath)) {
    console.log(`[ASSET] Serving /games/${gameId}/assets/${filename}`);
    res.sendFile(filePath);
  } else {
    console.log(`[ASSET] NOT FOUND: /games/${gameId}/assets/${filename}`);
    res.status(404).send('File not found');
  }
});

app.get('/cors-test', (req, res) => {
  res.json({ message: 'CORS test OK' });
});

// Export app for testing and server startup
module.exports = app;

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}