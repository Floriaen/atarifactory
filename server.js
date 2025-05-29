const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Dummy in-memory games list for MVP skeleton
global.gamesManifest = [];

const GAMES_DIR = path.join(__dirname, 'games');
const DUMMY_THUMB = '/public/dummy-thumb.png';
const LOGS_DIR = path.join(__dirname, 'logs');
const PROMPT_TEMPLATE_PATH = path.join(__dirname, 'llm_game_prompt.txt');

// Ensure /games/ directory exists
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR);
}

// Ensure /logs/ directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// --- Agent Stubs ---
async function GameDesignerAgent() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  const prompt = `Generate a JSON object for a new, simple Atari-style game. The object should have: title, description, and genre. Example:
{"title": "Space Bounce", "description": "Bounce the ball to destroy all blocks.", "genre": "arcade"}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful game designer.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.8,
  });
  // Extract JSON from the response
  const text = response.choices[0].message.content;
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    return json;
  } catch (e) {
    return { title: 'Untitled', description: 'Failed to parse gameSpec', genre: 'arcade' };
  }
}
function MechanicSynthesizerAgent(gameSpec) {
  const genre = (gameSpec.genre || '').toLowerCase();
  switch (genre) {
    case 'shooter':
      return {
        mechanics: ['move', 'shoot', 'dodge'],
        winCondition: 'destroy all enemies or survive 60 seconds',
      };
    case 'platformer':
      return {
        mechanics: ['move', 'jump', 'collect'],
        winCondition: 'reach the end of the level or collect all coins',
      };
    case 'arcade':
      return {
        mechanics: ['bounce', 'reverse', 'score'],
        winCondition: 'score reaches 100 or survive 2 minutes',
      };
    default:
      return {
        mechanics: ['move', 'score'],
        winCondition: 'get the highest score possible',
      };
  }
}
async function GameBuilderAgent(gameId, gameSpec, mechanicsBlock) {
  let gameJs = '';
  let instructions = '';
  // Read prompt template from file and fill in variables
  let promptTemplate = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
  const prompt = promptTemplate
    .replace(/{{title}}/g, gameSpec.title)
    .replace(/{{description}}/g, gameSpec.description)
    .replace(/{{mechanics}}/g, mechanicsBlock.mechanics.join(', '))
    .replace(/{{winCondition}}/g, mechanicsBlock.winCondition);
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful game developer. Only output valid vanilla JavaScript code for Canvas games.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1800,
      temperature: 0.8,
    });
    // Log prompt and response (simple: only prompt and first 10 lines of response)
    const responseText = response.choices[0].message.content;
    const responseLines = responseText.split('\n').slice(0, 10).join('\n');
    const llmLogPath = path.join(LOGS_DIR, `llm-${gameId}.log`);
    fs.writeFileSync(llmLogPath, JSON.stringify({ prompt, response_preview: responseLines }, null, 2));
    // Also log to server console
    console.log(`\n[LLM PROMPT for ${gameId}]\n${prompt}\n`);
    console.log(`[LLM RESPONSE (first 10 lines) for ${gameId}]\n${responseLines}\n`);
    // Extract code block from response
    const text = responseText;
    const match = text.match(/```(?:javascript)?([\s\S]*?)```/);
    gameJs = match ? match[1].trim() : text.trim();
    instructions = mechanicsBlock.mechanics.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ') + '. Win: ' + mechanicsBlock.winCondition;
  } catch (e) {
    // Fallback to static template if LLM fails
    instructions = 'Tap/click to reverse the ball.';
    gameJs = '// Simple bouncing ball Canvas game\nconst canvas = document.getElementById(\'game-canvas\');\nconst ctx = canvas.getContext(\'2d\');\nlet x = canvas.width/2, y = canvas.height/2, vx = 3, vy = 2;\nfunction draw() {\n  ctx.clearRect(0,0,canvas.width,canvas.height);\n  ctx.beginPath();\n  ctx.arc(x, y, 20, 0, Math.PI*2);\n  ctx.fillStyle = \'#0074d9\';\n  ctx.fill();\n  if(x+20>canvas.width||x-20<0) vx=-vx;\n  if(y+20>canvas.height||y-20<0) vy=-vy;\n  x+=vx; y+=vy;\n  requestAnimationFrame(draw);\n}\ndraw();\n';
  }
  return {
    'index.html': `<!DOCTYPE html>\n<html lang='en'>\n<head>\n  <meta charset='utf-8'>\n  <title>${gameSpec.title}</title>\n  <meta name='viewport' content='width=device-width,initial-scale=1.0,user-scalable=no'>\n  <style>body{margin:0;background:#181818;}#game-canvas{display:block;margin:0 auto;background:#222;width:100vw;height:100vh;}#desc{color:#ffb300;text-align:center;font-size:1.1em;margin:0.5em 0 0.2em 0;}#instructions{color:#ccc;text-align:center;font-size:0.95em;margin-bottom:0.5em;}</style>\n</head>\n<body>\n  <canvas id='game-canvas' width='800' height='600'></canvas>\n  <div id='desc'>${gameSpec.description}</div>\n  <div id='instructions'>${instructions}</div>\n  <script src='/games/${gameId}/assets/game.js'></script>\n</body>\n</html>`,
    'assets/game.js': gameJs
  };
}
function SaveAgent(gameId, gameSpec, mechanicsBlock, gameFiles) {
  const gameFolder = path.join(GAMES_DIR, gameId);
  if (!fs.existsSync(gameFolder)) fs.mkdirSync(gameFolder);
  // Save gameSpec
  fs.writeFileSync(path.join(gameFolder, 'game.json'), JSON.stringify({ gameSpec, mechanicsBlock }, null, 2));
  // Save files (handle assets subfolder)
  for (const [fname, content] of Object.entries(gameFiles)) {
    const outPath = path.join(gameFolder, fname);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, content);
  }
  // Save a dummy thumbnail (just reference for now)
  return { thumbnail: DUMMY_THUMB };
}

function logGame(id, gameSpec, mechanicsBlock) {
  const logPath = path.join(LOGS_DIR, `game-${id}.log`);
  const logData = {
    timestamp: new Date().toISOString(),
    gameSpec,
    mechanicsBlock,
  };
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
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
    const gameFiles = await GameBuilderAgent(id, gameSpec, mechanicsBlock);
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
    res.json({ success: true, game: newGame, gameSpec });
  } catch (err) {
    console.error('Error in /generate:', err);
    res.status(500).json({ success: false, error: err.message });
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