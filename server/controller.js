const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');
const { createSharedState } = require('./types/SharedState');
const fs = require('fs');
const path = require('path');

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

    // Get code and game design info (with env var fallback logic)
    const sharedState = await generateGameSourceCode(title, logger, onStatusUpdate);
    const code = sharedState.gameSource;
    const gameDef = sharedState.gameDef;
    const gameName = gameDef?.title || title;

    try {
      const cleanCode = code.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
      
      // Write game.js
      fs.writeFileSync(path.join(gameFolder, 'game.js'), cleanCode, 'utf8');
      
      // Copy control bar assets
      fs.copyFileSync(path.join(__dirname, 'gameBoilerplate', 'controlBar', 'controlBar.js'), path.join(gameFolder, 'controlBar.js'));
      fs.copyFileSync(path.join(__dirname, 'gameBoilerplate', 'controlBar', 'controlBar.css'), path.join(gameFolder, 'controlBar.css'));

      // Read the boilerplate template
      const boilerplatePath = path.join(__dirname, 'gameBoilerplate', 'game.html');
      let html = fs.readFileSync(boilerplatePath, 'utf8');
      // Replace template variables
      html = html
        .replace('{{title}}', gameName)
        .replace('{{description}}', gameDef.description || '')
        .replace('{{instructions}}', Array.isArray(gameDef.mechanics) ? gameDef.mechanics.join(', ') : gameDef.mechanics || '')
        .replace('{{gameId}}', gameId)
        .replace('{{controlBarHTML}}', fs.readFileSync(path.join(__dirname, 'gameBoilerplate', 'controlBar', 'controlBar.html'), 'utf8'));
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

async function generateGameSourceCode(title, logger, onStatusUpdate) {
  //const planningPipelineModule = await import('./agents/pipeline/planningPipeline.mjs');
  //const { runPlanningPipeline } = planningPipelineModule;
  const { runCodingPipeline } = (await import('./agents/pipeline/codingPipeline.mjs'));


  // MOCK_PIPELINE: Serve static debug/game.js and mock gameDef
  // If both MOCK_PIPELINE and MINIMAL_GAME are set, prefer MOCK_PIPELINE
  if (process.env.MOCK_PIPELINE === '1') {
    logger && logger.info && logger.info('MOCK_PIPELINE is active: using debug/game.js');
    const sharedState = createSharedState();
    sharedState.title = title;
    sharedState.gameDef = {
      title: title,
      description: 'A mock game for testing purposes',
      mechanics: ['move', 'jump'],
      winCondition: 'Collect all coins',
      entities: ['player', 'coin']
    };
    sharedState.code = fs.readFileSync(path.join(__dirname, 'debug', 'game.js'), 'utf8');
    sharedState.plan = [
      { id: 1, description: 'Set up the HTML canvas and main game loop' },
      { id: 2, description: 'Create the player entity and implement left/right movement' },
      { id: 3, description: 'Implement win condition when player reaches the right edge' }
    ];
    return sharedState;
  } else if (process.env.MINIMAL_GAME === '1') {
    // MINIMAL_GAME: only run coding pipeline with minimal gameDef/plan/code
    logger && logger.info && logger.info('MINIMAL_GAME is active: running coding pipeline only');
    const sharedState = createSharedState();
    sharedState.title = 'Minimal Platformer';
    sharedState.gameDef = {
      title: 'Minimal Platformer',
      description: 'Move left and right. Win by reaching the right edge.',
      mechanics: ['move left/right'],
      winCondition: 'Reach the right edge',
      entities: ['player']
    };
    sharedState.plan = [
      { id: 1, description: 'Set up the HTML canvas and main game loop' },
      { id: 2, description: 'Create the player entity and implement left/right movement' },
      { id: 3, description: 'Implement win condition when player reaches the right edge' }
    ];
    // Do not pre-set code in MINIMAL_GAME; let the coding pipeline generate it.
    await runCodingPipeline(sharedState, onStatusUpdate);
    return sharedState;
  } else {
    // Normal: run full orchestrator pipeline for unified progress/events
    const sharedState = createSharedState();
    sharedState.title = title;
    sharedState.onStatusUpdate = onStatusUpdate;
    const { runModularGameSpecPipeline } = await import('./agents/pipeline/pipeline.mjs');
    await runModularGameSpecPipeline(sharedState, {});
    return sharedState;
  }
}
module.exports = { runPipeline, generateGameSourceCode }; 