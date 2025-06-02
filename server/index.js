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
const PlannerAgent = require('./agents/PlannerAgent');
const StepBuilderAgent = require('./agents/code/StepBuilderAgent');
const StepFixerAgent = require('./agents/code/StepFixerAgent');
const DuplicateFixerAgent = require('./agents/code/DuplicateFixerAgent');
const DuplicateDeclarationChecker = require('./agents/code/DuplicateDeclarationChecker');
const LLMStaticCheckerAgent = require('./agents/code/LLMStaticCheckerAgent');
const FinalTesterAgent = require('./agents/code/FinalTesterAgent');
const AssemblerAgent = require('./agents/code/AssemblerAgent');
const { runPipeline } = require('./pipeline-v2/controller');
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
    console.log('[Agent] Calling GameDesignerAgent...');
    sendStep('Designing');
    const gameSpec = await GameDesignerAgent();
    console.log('[Agent] GameDesignerAgent output:', gameSpec);
    sendStep('Designing', { status: 'done', gameSpec });
    console.log('[Agent] Calling MechanicSynthesizerAgent...');
    sendStep('Synthesizing');
    const mechanicsBlock = MechanicSynthesizerAgent(gameSpec);
    console.log('[Agent] MechanicSynthesizerAgent output:', mechanicsBlock);
    sendStep('Synthesizing', { status: 'done', mechanicsBlock });
    console.log('[Agent] Calling PlannerAgent...');
    sendStep('Planning');
    const plan = await PlannerAgent({
      title: gameSpec.title,
      description: gameSpec.description,
      mechanics: mechanicsBlock.mechanics,
      winCondition: mechanicsBlock.winCondition
    });
    console.log('[Agent] PlannerAgent output:', plan);
    sendStep('Planning', { status: 'done', plan });
    let codeSteps = [];
    let currentCode = '';
    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      const isStub = /stub|create|define/.test(step.toLowerCase()) && /function|variable|const|let/.test(step.toLowerCase());
      const isExtend = /extend|add logic|augment|update/.test(step.toLowerCase());
      const mode = isStub ? 'stub' : (isExtend ? 'extend' : 'stub');
      console.log(`[Agent] Calling StepBuilderAgent for step ${i+1}/${plan.length} [mode=${mode}]:`, step);
      sendStep('Building', { step: i + 1, total: plan.length, description: step });
      let stepCode = await StepBuilderAgent(plan, currentCode, step, mode);
      // Strip code block markers if present
      stepCode = stepCode.replace(/^```(?:javascript)?\n?|```$/gim, '').trim();
      if (i === 0) {
        console.log('[DEBUG] First step currentCode:', JSON.stringify(currentCode));
        console.log('[DEBUG] First step stepCode:', JSON.stringify(stepCode));
      }
      if (mode === 'extend') {
        // Insert the code into the correct function in currentCode
        const match = step.match(/'(\w+)'/); // e.g., 'update'
        const funcName = match ? match[1] : null;
        if (funcName && currentCode.includes(`function ${funcName}(`)) {
          currentCode = currentCode.replace(
            new RegExp(`(function ${funcName}\([^)]*\)\s*{)([\s\S]*?)(^})`, 'm'),
            (m, start, body, end) => `${start}\n${stepCode}\n${body}${end}`
          );
          stepCode = '';
        } else {
          console.warn(`[Agent] Could not find function ${funcName} to extend. Skipping insertion.`);
        }
      }
      if (stepCode) {
        // Only push non-empty code (i.e., for stub steps)
        codeSteps.push(stepCode);
        currentCode += '\n' + stepCode;
      }
      // For the first step, skip duplicate check if currentCode is empty
      let duplicates = (i === 0 && !currentCode.trim()) ? [] : DuplicateDeclarationChecker(currentCode, stepCode);
      if (duplicates.length > 0) {
        console.warn(`[Agent] Duplicate declaration(s) found in step ${i+1}:`, duplicates);
        sendStep('FixingDuplicates', { step: i + 1, duplicates });
        stepCode = await DuplicateFixerAgent(plan, currentCode, stepCode, duplicates);
        console.log(`[Agent] DuplicateFixerAgent output (step ${i+1}):`, stepCode.slice(0, 120) + (stepCode.length > 120 ? '...' : ''));
        sendStep('FixedDuplicates', { step: i + 1, code: stepCode.slice(0, 120) + (stepCode.length > 120 ? '...' : '') });
        duplicates = DuplicateDeclarationChecker(currentCode, stepCode);
        if (duplicates.length > 0) {
          console.error(`[Agent] DuplicateFixerAgent could not fix step ${i+1}:`, duplicates);
          sendStep('Error', { error: `Step ${i+1} duplicate declaration(s): ${duplicates.join(', ')}`, step, plan });
          return res.end();
        }
      }
      let testResult = await LLMStaticCheckerAgent(currentCode, stepCode);
      console.log(`[Agent] LLMStaticCheckerAgent result (step ${i+1}):`, testResult);
      sendStep('Testing', { step: i + 1, result: testResult });
      if (!testResult.valid) {
        console.warn(`[Agent] Static check failed in step ${i+1}, calling StepFixerAgent...`, testResult.error);
        sendStep('Fixing', { step: i + 1, error: testResult.error });
        stepCode = await StepFixerAgent(plan, currentCode, step, testResult.error);
        console.log(`[Agent] StepFixerAgent output (step ${i+1}):`, stepCode.slice(0, 120) + (stepCode.length > 120 ? '...' : ''));
        sendStep('Fixed', { step: i + 1, code: stepCode.slice(0, 120) + (stepCode.length > 120 ? '...' : '') });
        testResult = await LLMStaticCheckerAgent(currentCode, stepCode);
        console.log(`[Agent] LLMStaticCheckerAgent result after fix (step ${i+1}):`, testResult);
        sendStep('Testing', { step: i + 1, result: testResult });
        if (!testResult.valid) {
          console.error(`[Agent] StepFixerAgent could not fix step ${i+1}:`, testResult.error);
          sendStep('Error', { error: `Step ${i+1} failed: ${testResult.error}`, step, plan });
          return res.end();
        }
      }
    }
    console.log('[Agent] Calling AssemblerAgent...');
    sendStep('Assembling');
    const finalGameJs = AssemblerAgent(codeSteps);
    console.log('[Agent] AssemblerAgent output (first 200 chars):', finalGameJs.slice(0, 200) + (finalGameJs.length > 200 ? '...' : ''));
    sendStep('Assembled', { code: finalGameJs.slice(0, 200) + (finalGameJs.length > 200 ? '...' : '') });
    console.log('[Agent] Calling FinalTesterAgent...');
    sendStep('FinalTesting');
    const finalTest = FinalTesterAgent(finalGameJs);
    console.log('[Agent] FinalTesterAgent result:', finalTest);
    sendStep('FinalTested', { result: finalTest });
    if (!finalTest.valid) {
      console.error('[Agent] FinalTesterAgent: Final game.js is invalid:', finalTest.error);
      sendStep('Error', { error: `Final game.js invalid: ${finalTest.error}` });
      return res.end();
    }
    console.log('[Agent] Calling GameBuilderAgent for final asset packaging...');
    sendStep('Packaging');
    let gameFiles = await GameBuilderAgent(id, gameSpec, mechanicsBlock);
    gameFiles['assets/game.js'] = finalGameJs;
    const { thumbnail } = SaveAgent(id, gameSpec, mechanicsBlock, gameFiles);
    const newGame = {
      id,
      name: gameSpec.title,
      date: new Date().toISOString(),
      thumbnail,
    };
    global.gamesManifest.push(newGame);
    logGame(id, gameSpec, mechanicsBlock);
    sendStep('Done', { game: newGame, gameSpec, plan });
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

// --- pipeline-v2 agent-based endpoint ---
app.post('/api/pipeline-v2/generate', async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Missing game title' });
  }
  try {
    const result = await runPipeline(title);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/pipeline-v2/generate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export app for testing and server startup
module.exports = app; 