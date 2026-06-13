import logger, { statusLogger } from './utils/logger.js';
import { addPipelineEvent } from './debug/traceBuffer.js';
import { v4 as uuidv4 } from 'uuid';
import { createSharedState } from './types/SharedState.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runCodingPipeline } from './agents/pipeline/codingPipeline.js';
import { runArtPipeline } from './agents/pipeline/artPipeline.js';
import { loadPack, savePack } from './utils/sprites/packStore.js';
import { runModularGameSpecPipeline } from './agents/pipeline/pipeline.js';
import { computeCostTotals } from './utils/costing.js';
import { captureAndUpdateThumbnail } from './utils/thumbnailCapture.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Orchestrates the agent pipeline for game generation.
 * @param {string} title - The game title
 * @param {function} [onStatusUpdate] - Optional callback for status updates: (step, data) => void
 * @param {object} [settings] - Generation settings from frontend
 * @returns {Promise<object>} - The final pipeline result
 */
async function runPipeline(title, onStatusUpdate, settings = {}) {
  const traceId = uuidv4();
  logger.info('Pipeline started', { traceId, title, settings });

  // Apply settings to environment (temporarily for this request)
  const originalEnv = {};
  if (settings.enableDebug !== undefined) {
    originalEnv.ENABLE_DEBUG = process.env.ENABLE_DEBUG;
    process.env.ENABLE_DEBUG = settings.enableDebug ? '1' : '0';
  }
  if (settings.enableDevTrace !== undefined) {
    originalEnv.ENABLE_DEV_TRACE = process.env.ENABLE_DEV_TRACE;
    process.env.ENABLE_DEV_TRACE = settings.enableDevTrace ? '1' : '0';
  }
  if (settings.mockPipeline !== undefined) {
    originalEnv.MOCK_PIPELINE = process.env.MOCK_PIPELINE;
    process.env.MOCK_PIPELINE = settings.mockPipeline ? '1' : '0';
  }
  if (settings.minimalGame !== undefined) {
    originalEnv.MINIMAL_GAME = process.env.MINIMAL_GAME;
    process.env.MINIMAL_GAME = settings.minimalGame ? '1' : '0';
  }
  if (settings.model) {
    originalEnv.OPENAI_MODEL = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = settings.model;
  }
  if (settings.logLevel) {
    originalEnv.LOG_LEVEL = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = settings.logLevel;
  }

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
    sharedState.traceId = sharedState.traceId || traceId;
    sharedState.gameId = gameId; // Make gameId available for thumbnail capture
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
      // Copy sprite helper
      fs.copyFileSync(path.join(__dirname, 'gameBoilerplate', 'sprites', 'sprites.js'), path.join(gameFolder, 'sprites.js'));

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

      // Enforce LLM-generated background: persist background.js and fail if missing (except in MOCK_PIPELINE)
      try {
        const bgCode = sharedState?.backgroundCode;
        if (typeof bgCode === 'string' && bgCode.trim().length > 0) {
          const cleanBg = bgCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
          fs.writeFileSync(path.join(gameFolder, 'background.js'), cleanBg, 'utf8');
        } else {
          if (process.env.MOCK_PIPELINE === '1') {
            // In mock mode, skip strict requirement
          } else {
            throw new Error('backgroundCode missing');
          }
        }
      } catch (e) {
        logger.error('Background generation required but missing', { error: e?.message });
        if (process.env.MOCK_PIPELINE === '1') {
          // Continue in mock mode
        } else {
          throw e;
        }
      }

      // Art pipeline: ensure sprites pack (fail hard on errors)
      if (Array.isArray(gameDef?.entities) && gameDef.entities.length > 0) {
        const packPath = path.join(gameFolder, 'sprites.json');
        sharedState.spritePackPath = packPath;
        // If orchestrator already prepared spritePack, persist it; else run Art pipeline now
        if (!sharedState.spritePack || !sharedState.spritePack.items || Object.keys(sharedState.spritePack.items).length === 0) {
          // Controller loads current pack for cache warm; Art pipeline mutates in-memory
          sharedState.spritePack = loadPack(packPath);
          try {
            const { stats, pack } = await runArtPipeline(sharedState, wrappedOnStatusUpdate);
            savePack(packPath, pack);
            logger.info('Sprite pack summary', { gameId, ...stats, packPath });
            if (process.env.ENABLE_DEBUG === '1') {
              try { addPipelineEvent({ type: 'SpritesSummary', payload: { gameId, ...stats, packPath } }); } catch {}
            }
          } catch (e) {
            logger.error('Art pipeline failed', { error: e?.message });
            throw e;
          }
        } else {
          // Orchestrator already produced pack; persist it now
          savePack(packPath, sharedState.spritePack);
          logger.info('Sprite pack summary (persisted orchestrator pack)', { gameId, packPath, requested: gameDef.entities.length });
          if (process.env.ENABLE_DEBUG === '1') {
            try { addPipelineEvent({ type: 'SpritesSummary', payload: { gameId, packPath } }); } catch {}
          }
        }
      }
      // Persist build metadata (for frontend capsule details)
      try {
        const started = sharedState?.metadata?.startTime ? new Date(sharedState.metadata.startTime).getTime() : Date.now();
        const durationMs = Math.max(0, Date.now() - started);
        const cost = computeCostTotals(sharedState);
        const meta = {
          id: gameId,
          name: gameName,
          description: gameDef?.description || '',
          date: gameDate,
          model: process.env.OPENAI_MODEL || 'unknown',
          durationMs,
          tokens: {
            total: Number(sharedState.tokenCount || 0),
            prompt: Number(sharedState.promptTokens || 0),
            completion: Number(sharedState.completionTokens || 0)
          },
          cost: {
            usd: Number((cost?.total?.usd ?? 0).toFixed ? cost.total.usd.toFixed(2) : (Math.round((cost?.total?.usd || 0)*100)/100)),
            byModel: cost?.byModel || {}
          }
        };
        fs.writeFileSync(path.join(gameFolder, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
      } catch (e) {
        logger.warn('Failed to write build meta.json', { error: e?.message });
      }

      // Thumbnail capture
      try {
        await captureAndUpdateThumbnail(gameId, gameFolder);
      } catch (thumbErr) {
        logger.warn('Thumbnail capture failed', { error: thumbErr?.message });
      }
    } catch (err) {
      logger.error('Failed to write game files', { gameId, gameFolder, error: err.message, stack: err.stack });
      throw err;
    }

    // Update manifest
    if (!global.gamesManifest) global.gamesManifest = [];
    const thumbExists = fs.existsSync(path.join(GAMES_DIR, gameId, 'thumb.png'));
    const gameMeta = { 
      id: gameId, 
      name: gameName, 
      date: gameDate, 
      url: `/games/${gameId}/`,
      thumbnail: thumbExists ? `/games/${gameId}/thumb.png` : null
    };
    global.gamesManifest.unshift(gameMeta);
    // Emit final SSE event if callback
    onStatusUpdate && onStatusUpdate('Done', { game: gameMeta });

    // Restore original environment variables
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });

    return {
      game: gameMeta
    };
  } catch (err) {
    logger.error('Pipeline error', { traceId, error: err, errorMessage: err && err.message, errorStack: err && err.stack });
    onStatusUpdate && onStatusUpdate('Error', { error: err.message, stack: err.stack });

    // Restore original environment variables even on error
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });

    throw err;
  }
}

async function generateGameSourceCode(title, logger, onStatusUpdate) {
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
    // MINIMAL_GAME: use orchestrator with pre-populated gameDef/plan (planning phase will be skipped)
    logger && logger.info && logger.info('MINIMAL_GAME is active: using orchestrator with pre-populated gameDef and plan');
    const sharedState = createSharedState();
    sharedState.title = 'Minimal Platformer';
    sharedState.onStatusUpdate = onStatusUpdate;
    sharedState.gameDef = {
      title: 'Minimal Platformer',
      description: 'Move left and right. Win by reaching the right edge.',
      mechanics: ['move left/right'],
      winCondition: 'Reach the right edge',
      entities: ['player', 'background']
    };
    sharedState.plan = [
      { id: 1, description: 'Set up the HTML canvas and main game loop' },
      { id: 2, description: 'Create the player entity and implement left/right movement' },
      { id: 3, description: 'Implement win condition when player reaches the right edge' }
    ];
    // Use orchestrator for unified progress/events (planning will be skipped automatically)
    await runModularGameSpecPipeline(sharedState, {});
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
