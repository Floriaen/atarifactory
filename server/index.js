const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const GameDesignerAgent = require('./agents/GameDesignerAgent');
const MechanicSynthesizerAgent = require('./agents/MechanicSynthesizerAgent');
const GameBuilderAgent = require('./agents/GameBuilderAgent');
const SaveAgent = require('./agents/SaveAgent');
const logGame = require('./utils/logGame');
const GameCriticAgent = require('./agents/GameCriticAgent');
const RuleEnforcerAgent = require('./agents/RuleEnforcerAgent');
const FixerAgent = require('./agents/FixerAgent');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

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

// POST /generate - pipeline with async GameDesignerAgent
app.post('/generate', async (req, res) => {
  const id = uuidv4();
  try {
    // Pipeline
    const gameSpec = await GameDesignerAgent();
    console.log('[GameDesignerAgent] Generated gameSpec:', gameSpec);
    const mechanicsBlock = MechanicSynthesizerAgent(gameSpec);
    console.log('[MechanicSynthesizerAgent] mechanicsBlock:', mechanicsBlock);
    let gameFiles = await GameBuilderAgent(id, gameSpec, mechanicsBlock);
    const originalGameJs = gameFiles['assets/game.js']; // Cache original LLM code
    let isCompliant = true;
    // --- Rule Enforcer step ---
    const ruleReport = RuleEnforcerAgent(gameFiles['assets/game.js']);
    if (!ruleReport.compliant) {
      isCompliant = false;
      console.log(`[RuleEnforcerAgent] Violations found for ${id}:`, ruleReport.violations);
      const fixedJs = await FixerAgent(id, gameFiles['assets/game.js'], ruleReport);
      gameFiles['assets/game.js'] = fixedJs;
      // Re-run rule enforcer after fix (optional, for safety)
      const ruleReport2 = RuleEnforcerAgent(gameFiles['assets/game.js']);
      if (!ruleReport2.compliant) {
        console.warn(`[WARN] FixerAgent failed to fix all rule violations for ${id}. Serving original LLM code.`);
        // Restore original LLM code from cache
        gameFiles['assets/game.js'] = originalGameJs;
      } else {
        isCompliant = true;
      }
    } else {
      console.log(`[RuleEnforcerAgent] No violations for ${id}`);
    }
    // --- Critic Agent step ---
    const criticResult = await GameCriticAgent(id, { ...gameSpec, ...mechanicsBlock }, gameFiles['assets/game.js']);
    if (criticResult.fixedJs) {
      console.log(`[GameCriticAgent] Fixed code for ${id}`);
      gameFiles['assets/game.js'] = criticResult.fixedJs;
    } else {
      console.log(`[GameCriticAgent] No fix needed for ${id}`);
    }
    // --- FINAL: Remove alert() and replace with in-game message ---
    const { thumbnail } = SaveAgent(id, gameSpec, mechanicsBlock, gameFiles);
    // Add to manifest
    const newGame = {
      id,
      name: gameSpec.title,
      date: new Date().toISOString(),
      thumbnail,
    };
    global.gamesManifest.push(newGame);
    logGame(id, gameSpec, mechanicsBlock);
    res.json({ success: true, game: newGame, gameSpec, compliance: isCompliant });
  } catch (err) {
    console.error('Error in /generate:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SSE /generate-stream endpoint ---
app.post('/generate-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  function sendStep(step, data = {}) {
    res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);
  }
  const id = uuidv4();
  try {
    // 1. GameDesignerAgent
    sendStep('Designing');
    const gameSpec = await GameDesignerAgent();
    sendStep('Designing', { status: 'done', gameSpec });
    // 2. MechanicSynthesizerAgent
    sendStep('Synthesizing');
    const mechanicsBlock = MechanicSynthesizerAgent(gameSpec);
    sendStep('Synthesizing', { status: 'done', mechanicsBlock });
    // 3. GameBuilderAgent
    sendStep('Building');
    let gameFiles = await GameBuilderAgent(id, gameSpec, mechanicsBlock);
    const originalGameJs = gameFiles['assets/game.js']; // Cache original LLM code
    let isCompliant = true;
    // 4. RuleEnforcerAgent
    sendStep('Enforcing Rules');
    const ruleReport = RuleEnforcerAgent(gameFiles['assets/game.js']);
    sendStep('Enforcing Rules', { status: 'done', ruleReport });
    if (!ruleReport.compliant) {
      isCompliant = false;
      sendStep('Fixing');
      const fixedJs = await FixerAgent(id, gameFiles['assets/game.js'], ruleReport);
      gameFiles['assets/game.js'] = fixedJs;
      // Re-run rule enforcer after fix
      const ruleReport2 = RuleEnforcerAgent(gameFiles['assets/game.js']);
      sendStep('Fixing', { status: 'done', ruleReport: ruleReport2 });
      if (!ruleReport2.compliant) {
        console.warn(`[WARN] FixerAgent failed to fix all rule violations for ${id}. Serving original LLM code.`);
        // Restore original LLM code from cache
        gameFiles['assets/game.js'] = originalGameJs;
      } else {
        isCompliant = true;
      }
    }
    // 5. GameCriticAgent
    sendStep('Reviewing');
    const criticResult = await GameCriticAgent(id, { ...gameSpec, ...mechanicsBlock }, gameFiles['assets/game.js']);
    if (criticResult.fixedJs) {
      gameFiles['assets/game.js'] = criticResult.fixedJs;
      sendStep('Reviewing', { status: 'fixed' });
    } else {
      sendStep('Reviewing', { status: 'no-fix' });
    }
    // 6. SaveAgent
    sendStep('Saving');
    const { thumbnail } = SaveAgent(id, gameSpec, mechanicsBlock, gameFiles);
    sendStep('Saving', { status: 'done' });
    // 7. Manifest/log
    const newGame = {
      id,
      name: gameSpec.title,
      date: new Date().toISOString(),
      thumbnail,
    };
    global.gamesManifest.push(newGame);
    logGame(id, gameSpec, mechanicsBlock);
    sendStep('Done', { game: newGame, gameSpec });
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

// GET /games/:id - serve generated game
app.get('/games/:id', (req, res) => {
  const gameId = req.params.id;
  const gameFolder = path.join(GAMES_DIR, gameId);
  const indexPath = path.join(gameFolder, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`[GAME] Serving /games/${gameId}/index.html`);
    res.sendFile(indexPath);
  } else {
    console.log(`[GAME] NOT FOUND: /games/${gameId}/index.html`);
    res.status(404).send('Game not found');
  }
});

app.get('/cors-test', (req, res) => {
  res.json({ message: 'CORS test OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 