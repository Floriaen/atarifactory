const GameDesignAgent = require('./agents/GameDesignAgent');
const PlannerAgent = require('./agents/PlannerAgent');
const ContextStepBuilderAgent = require('./agents/ContextStepBuilderAgent');
const StaticCheckerAgent = require('./agents/StaticCheckerAgent');
const BlockInserterAgent = require('./agents/BlockInserterAgent');
const SyntaxSanityAgent = require('./agents/SyntaxSanityAgent');
const RuntimePlayabilityAgent = require('./agents/RuntimePlayabilityAgent');
const FeedbackAgent = require('./agents/FeedbackAgent');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');
const SmartOpenAI = require('./utils/SmartOpenAI');
const { createSharedState } = require('./types/SharedState');
const fs = require('fs');
const path = require('path');
let llmClient = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    llmClient = new SmartOpenAI(openai);
  }
} catch (err) {
  logger.warn('OpenAI SDK not available or failed to initialize', { error: err });
}

/**
 * Orchestrates the agent pipeline for game generation.
 * @param {string} title - The game title
 * @param {function} [onStatusUpdate] - Optional callback for status updates: (step, data) => void
 * @returns {Promise<object>} - The final pipeline result
 */
async function runPipeline(title, onStatusUpdate) {
  const traceId = uuidv4();
  logger.info('Pipeline started', { traceId, title });
  try {
    // --- Save generated game to disk and update manifest ---
    const gameId = uuidv4();
    const gameDate = new Date().toISOString();
    // Save to server/games/ so the server can serve the files
    const GAMES_DIR = path.join(__dirname, 'games');
    const gameFolder = path.join(GAMES_DIR, gameId);
    logger.info('About to write game files', { gameId, gameFolder });
    console.log('[DEBUG] About to write game files to:', gameFolder);
    try {
      if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR);
    } catch (err) {
      logger.error('Failed to create GAMES_DIR', { gameId, GAMES_DIR, error: err });
      console.error('Failed to create GAMES_DIR', GAMES_DIR, err);
      throw err;
    }
    try {
      if (!fs.existsSync(gameFolder)) fs.mkdirSync(gameFolder);
    } catch (err) {
      logger.error('Failed to create gameFolder', { gameId, gameFolder, error: err });
      console.error('Failed to create gameFolder', gameFolder, err);
      throw err;
    }

    // Get code and game design info from pure pipeline (mock or real)
    const { code, gameDef } = await generateGameSourceCode(title, logger, llmClient, onStatusUpdate);
    const gameName = gameDef?.title || title;

    try {
      const cleanCode = code.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
      
      // Write game.js
      fs.writeFileSync(path.join(gameFolder, 'game.js'), cleanCode, 'utf8');
      
      // Copy control bar assets
      fs.copyFileSync(path.join(__dirname, 'controlBar', 'controlBar.js'), path.join(gameFolder, 'controlBar.js'));
      fs.copyFileSync(path.join(__dirname, 'controlBar', 'controlBar.css'), path.join(gameFolder, 'controlBar.css'));

      // Read the boilerplate template
      const boilerplatePath = path.join(__dirname, 'gameBoilerplate.html');
      let html = fs.readFileSync(boilerplatePath, 'utf8');
      // Replace template variables
      html = html
        .replace('{{title}}', gameName)
        .replace('{{description}}', gameDef.description || '')
        .replace('{{instructions}}', Array.isArray(gameDef.mechanics) ? gameDef.mechanics.join(', ') : gameDef.mechanics || '')
        .replace('{{gameId}}', gameId)
        .replace('{{controlBarHTML}}', fs.readFileSync(path.join(__dirname, 'controlBar/controlBar.html'), 'utf8'));
      fs.writeFileSync(path.join(gameFolder, 'index.html'), html, 'utf8');
    } catch (err) {
      logger.error('Failed to write game files', { gameId, gameFolder, error: err });
      console.error('Failed to write game files', err);
      throw err;
    }

    // Update manifest
    if (!global.gamesManifest) global.gamesManifest = [];
    const gameMeta = { id: gameId, name: gameName, date: gameDate, url: `/games/${gameId}/` };
    global.gamesManifest.unshift(gameMeta);
    // Emit final SSE event if callback
    onStatusUpdate && onStatusUpdate('Done', { game: gameMeta });
    return {
      game: gameMeta
    };
  } catch (err) {
    logger.error('Pipeline error', { traceId, error: err, errorMessage: err && err.message, errorStack: err && err.stack });
    onStatusUpdate && onStatusUpdate('Error', { error: err.message, stack: err.stack });
    throw err;
  }
}

// Pure agent pipeline: returns both the generated code and game design info
async function agentPipelineToCode(title, logger, llmClient, onStatusUpdate) {
  const traceId = uuidv4();
  logger.info('Agent pipeline started', { traceId, title });
  const sharedState = createSharedState();
  sharedState.title = title;
  // Load canonical JS boilerplate as the initial gameSource
  const fs = require('fs');
  const path = require('path');
  const boilerplatePath = path.join(__dirname, 'gameBoilerplate.js');
  sharedState.gameSource = fs.readFileSync(boilerplatePath, 'utf8');
  // 1. GameDesignAgent
  onStatusUpdate && onStatusUpdate('Designing', { step: 'Game Design' });
  await GameDesignAgent(sharedState, { logger, traceId, llmClient });
  logger.info('GameDesignAgent output', { traceId, gameDef: sharedState.gameDef });
  // 2. PlannerAgent
  onStatusUpdate && onStatusUpdate('Planning', { step: 'Game Planning' });
  await PlannerAgent(sharedState, { logger, traceId, llmClient });
  // 3. ContextStepBuilderAgent for each step
  let stepIndex = 0;
  for (const step of sharedState.plan) {
    stepIndex++;
    sharedState.currentStep = step;
    onStatusUpdate && onStatusUpdate('Step', { step: `Step ${stepIndex}/${sharedState.plan.length}`, description: step.description });
    logger.info('ContextStepBuilderAgent execution', { traceId, currentStep: step });
    // Always update the full canonical JS file
    const revisedSource = await ContextStepBuilderAgent(sharedState, { logger, traceId, llmClient });
    logger.info('ContextStepBuilderAgent output', { traceId, currentStep: step });
    if (typeof revisedSource === 'string' && revisedSource.trim()) {
      sharedState.gameSource = revisedSource;
    } else {
      logger.error('Pipeline: ContextStepBuilderAgent returned undefined/empty output', { traceId, step });
      sharedState.metadata = sharedState.metadata || {};
      sharedState.metadata.llmError = `Pipeline: ContextStepBuilderAgent output was undefined or empty for step: ${step.description}`;
      // Do NOT overwrite sharedState.gameSource
    }
  }
  // 4. StaticCheckerAgent
  const errors = await StaticCheckerAgent(sharedState, { logger, traceId });
  logger.info('StaticCheckerAgent output', { traceId, errors });
  // 5. SyntaxSanityAgent
  onStatusUpdate && onStatusUpdate('Validating', { step: 'Syntax Validation' });
  await SyntaxSanityAgent(sharedState, { logger, traceId });
  // 6. RuntimePlayabilityAgent
  onStatusUpdate && onStatusUpdate('Testing', { step: 'Runtime Testing' });
  await RuntimePlayabilityAgent(sharedState, { logger, traceId });
  logger.info('RuntimePlayabilityAgent output', { traceId });
  // 8. FeedbackAgent
  onStatusUpdate && onStatusUpdate('Feedback', { step: 'Gathering Feedback' });
  await FeedbackAgent(sharedState, { logger, traceId, llmClient });
  logger.info('FeedbackAgent output', { traceId });
  // Return both the generated code and game design info
  return {
    code: sharedState.gameSource,
    gameDef: sharedState.gameDef
  };
}

// Pure function: returns JS code string (mock or real)
async function generateGameSourceCode(title, logger, llmClient, onStatusUpdate) {
  if (process.env.MOCK_PIPELINE === '1') {
    logger.info('MOCK_PIPELINE is active: using mock game.js');
    return {
      code: fs.readFileSync(path.join(__dirname, 'mocks', 'game.js'), 'utf8'),
      gameDef: {
        title: title,
        description: 'A mock game for testing purposes',
        mechanics: ['move', 'jump'],
        winCondition: 'Collect all coins',
        entities: ['player', 'coin']
      }
    };
  } else if (process.env.MINIMAL_GAME === '1') {
    logger.info('MINIMAL_GAME is active: using hardcoded minimal gameDef and plan');
    // Create a minimal sharedState and inject minimal gameDef and plan
    const traceId = require('uuid').v4();
    const { createSharedState } = require('./types/SharedState');
    const sharedState = createSharedState();
    sharedState.title = "Minimal Platformer";
    sharedState.gameDef = {
      title: "Minimal Platformer",
      description: "Move left and right. Win by reaching the right edge.",
      mechanics: ["move left/right"],
      winCondition: "Reach the right edge",
      entities: ["player"]
    };
    sharedState.plan = [
      { id: 1, description: "Set up the HTML canvas and main game loop" },
      { id: 2, description: "Create the player entity and implement left/right movement" },
      { id: 3, description: "Implement win condition when player reaches the right edge" }
    ];
    // Load canonical JS boilerplate as the initial gameSource
    const fs = require('fs');
    const path = require('path');
    const boilerplatePath = path.join(__dirname, 'gameBoilerplate.js');
    sharedState.gameSource = fs.readFileSync(boilerplatePath, 'utf8');
    // Run the rest of the pipeline as usual, skipping GameDesignAgent and PlannerAgent
    // 3. ContextStepBuilderAgent for each step
    let stepIndex = 0;
    for (const step of sharedState.plan) {
      stepIndex++;
      sharedState.currentStep = step;
      onStatusUpdate && onStatusUpdate('Step', { step: `Step ${stepIndex}/${sharedState.plan.length}`, description: step.description });
      logger.info('ContextStepBuilderAgent execution', { traceId, currentStep: step });
      const revisedSource = await ContextStepBuilderAgent(sharedState, { logger, traceId, llmClient });
      logger.info('ContextStepBuilderAgent output', { traceId, currentStep: step });
      if (typeof revisedSource === 'string' && revisedSource.trim()) {
        sharedState.gameSource = revisedSource;
      } else {
        logger.error('Pipeline: ContextStepBuilderAgent returned undefined/empty output', { traceId, step });
        sharedState.metadata = sharedState.metadata || {};
        sharedState.metadata.llmError = `Pipeline: ContextStepBuilderAgent output was undefined or empty for step: ${step.description}`;
        // Do NOT overwrite sharedState.gameSource
      }
    }
    // 4. StaticCheckerAgent
    const errors = await StaticCheckerAgent(sharedState, { logger, traceId });
    logger.info('StaticCheckerAgent output', { traceId, errors });
    // 6. SyntaxSanityAgent
    onStatusUpdate && onStatusUpdate('Validating', { step: 'Syntax Validation' });
    await SyntaxSanityAgent(sharedState, { logger, traceId });
    // 7. RuntimePlayabilityAgent
    onStatusUpdate && onStatusUpdate('Testing', { step: 'Runtime Testing' });
    await RuntimePlayabilityAgent(sharedState, { logger, traceId });
    logger.info('RuntimePlayabilityAgent output', { traceId });
    // 8. FeedbackAgent
    onStatusUpdate && onStatusUpdate('Feedback', { step: 'Gathering Feedback' });
    await FeedbackAgent(sharedState, { logger, traceId, llmClient });
    logger.info('FeedbackAgent output', { traceId });
    // Write debug shared state for replay/debugging
    const debugPath = path.join(__dirname, '../debug_sharedState.json');
    fs.writeFileSync(debugPath, JSON.stringify(sharedState, null, 2));
    // Return both the generated code and game design info
    return {
      code: sharedState.gameSource,
      gameDef: sharedState.gameDef
    };

  } else {
    return await agentPipelineToCode(title, logger, llmClient, onStatusUpdate);
  }
}

module.exports = { runPipeline, generateGameSourceCode }; 