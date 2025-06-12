const GameDesignAgent = require('./agents/GameDesignAgent');
const PlannerAgent = require('./agents/PlannerAgent');
const StepBuilderAgent = require('./agents/StepBuilderAgent');
const StaticCheckerAgent = require('./agents/StaticCheckerAgent');
const StepFixerAgent = require('./agents/StepFixerAgent');
// const BlockInserterAgent = require('./agents/BlockInserterAgent');
const BlockInserterAgent = require('./agents/BlockInserterAgentLLM');
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
  // 1. GameDesignAgent
  onStatusUpdate && onStatusUpdate('Designing', { step: 'Game Design' });
  await GameDesignAgent(sharedState, { logger, traceId, llmClient });
  logger.info('GameDesignAgent output', { traceId, gameDef: sharedState.gameDef });
  // 2. PlannerAgent
  onStatusUpdate && onStatusUpdate('Planning', { step: 'Game Planning' });
  await PlannerAgent(sharedState, { logger, traceId, llmClient });
  logger.info('PlannerAgent output', { traceId, plan: sharedState.plan });
  // 3. Step execution cycle
  const MAX_STATIC_CHECK_RETRIES = 0;
  let stepIndex = 0;
  for (const step of sharedState.plan) {
    stepIndex++;
    sharedState.currentStep = step;
    onStatusUpdate && onStatusUpdate('Step', { step: `Step ${stepIndex}/${sharedState.plan.length}`, description: step.description });
    logger.info('Step execution', { traceId, step });
    let stepCode = await StepBuilderAgent(sharedState, { logger, traceId, llmClient });
    logger.info('StepBuilderAgent output', { traceId, step, stepCode });
    sharedState.stepCode = stepCode;
    let errors = await StaticCheckerAgent(sharedState, { logger, traceId, llmClient });
    logger.info('StaticCheckerAgent output', { traceId, step, errors });
    let retryCount = 0;
    while (errors.length > 0 && retryCount < MAX_STATIC_CHECK_RETRIES) {
      sharedState.errors = errors;
      stepCode = await StepFixerAgent(sharedState, { logger, traceId, llmClient });
      logger.info('StepFixerAgent output', { traceId, step, stepCode, retryCount });
      sharedState.stepCode = stepCode;
      errors = await StaticCheckerAgent(sharedState, { logger, traceId, llmClient });
      logger.info('StaticCheckerAgent output after fix', { traceId, step, errors, retryCount });
      retryCount++;
    }
    if (errors.length > 0) {
      logger.error('Static validation failed after max retries, escalating to PlannerAgent or aborting', { traceId, step, errors });
      throw new Error(`Static validation failed for step ${JSON.stringify(step)} after ${MAX_STATIC_CHECK_RETRIES} retries: ${errors.join('; ')}`);
    }
    sharedState.currentCode = await BlockInserterAgent(sharedState, { logger, traceId });
    logger.info('BlockInserterAgent output', { traceId, step, currentCode: sharedState.currentCode });
  }
  // 4. SyntaxSanityAgent
  onStatusUpdate && onStatusUpdate('Validating', { step: 'Syntax Validation' });
  SyntaxSanityAgent(sharedState, { logger, traceId });
  logger.info('SyntaxSanityAgent output', { traceId });
  // 5. RuntimePlayabilityAgent
  onStatusUpdate && onStatusUpdate('Testing', { step: 'Runtime Testing' });
  await RuntimePlayabilityAgent(sharedState, { logger, traceId });
  logger.info('RuntimePlayabilityAgent output', { traceId });
  // 6. FeedbackAgent
  onStatusUpdate && onStatusUpdate('Feedback', { step: 'Gathering Feedback' });
  await FeedbackAgent(sharedState, { logger, traceId, llmClient });
  logger.info('FeedbackAgent output', { traceId });
  // Return both the generated code and game design info
  return {
    code: sharedState.currentCode,
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
  } else {
    return await agentPipelineToCode(title, logger, llmClient, onStatusUpdate);
  }
}

module.exports = { runPipeline, generateGameSourceCode }; 