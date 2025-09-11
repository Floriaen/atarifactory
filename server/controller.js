import logger, { statusLogger } from './utils/logger.js';
import { addPipelineEvent } from './debug/traceBuffer.js';
import { v4 as uuidv4 } from 'uuid';
import { createSharedState } from './types/SharedState.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runCodingPipeline } from './agents/pipeline/codingPipeline.js';
import { generateMaskViaLLM } from './utils/sprites/llmGenerator.js';
import { loadPack, savePack } from './utils/sprites/packStore.js';
import { runModularGameSpecPipeline } from './agents/pipeline/pipeline.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Orchestrates the agent pipeline for game generation.
 * @param {string} title - The game title
 * @param {function} [onStatusUpdate] - Optional callback for status updates: (step, data) => void
 * @returns {Promise<object>} - The final pipeline result
 */
async function runPipeline(title, onStatusUpdate) {
  const traceId = uuidv4();
  logger.info('Pipeline started', { traceId, title });
  
  // Wrap onStatusUpdate to log all events
  const wrappedOnStatusUpdate = onStatusUpdate ? (type, payload) => {
    statusLogger.info('Controller status event', {
      eventType: type,
      payload: payload,
      traceId: traceId
    });
    if (process.env.ENABLE_DEBUG === '1') {
      try { addPipelineEvent({ type, payload, traceId }); } catch {}
    }
    return onStatusUpdate(type, payload);
  } : undefined;
  
  try {
    // --- Save generated game to disk and update manifest ---
    const gameId = uuidv4();
    const gameDate = new Date().toISOString();
    // Save to server/games/ so the server can serve the files
    const GAMES_DIR = path.join(__dirname, 'games');
    const gameFolder = path.join(GAMES_DIR, gameId);
    logger.info('About to write game files', { gameId, gameFolder });
    logger.debug('About to write game files to', { gameFolder });
    try {
      if (!fs.existsSync(GAMES_DIR)) fs.mkdirSync(GAMES_DIR);
    } catch (err) {
      logger.error('Failed to create GAMES_DIR', { gameId, GAMES_DIR, error: err.message });
      throw err;
    }
    try {
      if (!fs.existsSync(gameFolder)) fs.mkdirSync(gameFolder);
    } catch (err) {
      logger.error('Failed to create gameFolder', { gameId, gameFolder, error: err.message });
      throw err;
    }

    // Get code and game design info (with env var fallback logic)
    const sharedState = await generateGameSourceCode(title, logger, wrappedOnStatusUpdate);
    const code = sharedState.gameSource;
    const gameDef = sharedState.gameDef;
    const gameName = gameDef?.title || gameDef?.name || title;

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

      // P2/P5: ensure sprites pack (optional; guarded by env) + metrics
      if (process.env.ENABLE_SPRITE_GENERATION === '1' && Array.isArray(gameDef?.entities)) {
        const packPath = path.join(gameFolder, 'sprites.json');
        const pack = loadPack(packPath);
        const stats = { requested: 0, generated: 0, cached: 0, fallback: 0 };
        for (const ent of gameDef.entities) {
          const key = String(ent).toLowerCase();
           stats.requested++;
          if (!pack.items[key]) {
            try {
              const mask = await generateMaskViaLLM(key, { gridSize: 12 });
              pack.items[key] = mask;
              stats.generated++;
            } catch (e) {
              logger.warn('Sprite generation failed, using placeholder', { entity: key, error: e?.message });
              // minimal placeholder (single pixel center)
              pack.items[key] = { gridSize: 12, frames: [Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=> x===6&&y===6))] };
              stats.fallback++;
            }
          } else {
            stats.cached++;
          }
        }
        savePack(packPath, pack);
        logger.info('Sprite pack summary', { gameId, ...stats, packPath });
        if (process.env.ENABLE_DEBUG === '1') {
          try { addPipelineEvent({ type: 'SpritesSummary', payload: { gameId, ...stats, packPath } }); } catch {}
        }
      }
    } catch (err) {
      logger.error('Failed to write game files', { gameId, gameFolder, error: err.message, stack: err.stack });
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
  //const planningPipelineModule = await import('./agents/pipeline/planningPipeline.js');
  //const { runPlanningPipeline } = planningPipelineModule;


  // MOCK_PIPELINE: Serve static tests/fixtures/bouncing-square-game.js and mock gameDef
  // If both MOCK_PIPELINE and MINIMAL_GAME are set, prefer MOCK_PIPELINE
  if (process.env.MOCK_PIPELINE === '1') {
    logger && logger.info && logger.info('MOCK_PIPELINE is active: using tests/fixtures/bouncing-square-game.js');
    logger.info('Mock pipeline step', { step: 'creating_shared_state' });
    const sharedState = createSharedState();
    sharedState.title = title;
    sharedState.onStatusUpdate = onStatusUpdate;
    logger.info('Mock pipeline step', { step: 'loading_game_source' });
    sharedState.gameSource = await fs.promises.readFile(path.join(__dirname, 'tests/fixtures/bouncing-square-game.js'), 'utf8');
    sharedState.gameDef = {
      title: 'Bouncing Square',
      mechanics: ['move', 'bounce'],
      winCondition: 'none',
      entities: ['square'],
    };
    sharedState.plan = [
      { id: 1, description: 'Set up the HTML canvas and main game loop' },
      { id: 2, description: 'Create the player entity and implement left/right movement' },
      { id: 3, description: 'Implement win condition when player reaches the right edge' }
    ];
    logger.info('Mock pipeline step', { step: 'running_coding_pipeline' });
    await runCodingPipeline(sharedState, onStatusUpdate);
    logger.info('Mock pipeline step', { step: 'finished_coding_pipeline' });
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
    // runModularGameSpecPipeline is now imported at the top
    await runModularGameSpecPipeline(sharedState, {});
    return sharedState;
  }
}
export { runPipeline, generateGameSourceCode }; 
