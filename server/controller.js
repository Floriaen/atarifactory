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
    const sharedState = createSharedState();
    
    // 1. GameDesignAgent
    onStatusUpdate && onStatusUpdate('Designing');
    await GameDesignAgent(sharedState, { logger, traceId, llmClient });
    logger.info('GameDesignAgent output', { traceId, gameDef: sharedState.gameDef });
    onStatusUpdate && onStatusUpdate('Designing', { status: 'done', gameDef: sharedState.gameDef });

    // 2. PlannerAgent
    onStatusUpdate && onStatusUpdate('Planning');
    await PlannerAgent(sharedState, { logger, traceId, llmClient });
    logger.info('PlannerAgent output', { traceId, plan: sharedState.plan });
    onStatusUpdate && onStatusUpdate('Planning', { status: 'done', plan: sharedState.plan });

    // 3. Step execution cycle
    const STATIC_FIX_RETRY_LIMIT = 3;
    let stepIndex = 0;
    for (const step of sharedState.plan) {
      stepIndex++;
      sharedState.currentStep = step;
      onStatusUpdate && onStatusUpdate('Step', { step: stepIndex, total: sharedState.plan.length, label: step.label });
      logger.info('Step execution', { traceId, step });
      // StepBuilderAgent
      let stepCode = await StepBuilderAgent(sharedState, { logger, traceId, llmClient });
      logger.info('StepBuilderAgent output', { traceId, step, stepCode });
      sharedState.stepCode = stepCode;
      // Repeat-until-clean static validation loop
      let errors = StaticCheckerAgent(sharedState, { logger, traceId });
      logger.info('StaticCheckerAgent output', { traceId, step, errors });
      let retryCount = 0;
      while (errors.length > 0 && retryCount < STATIC_FIX_RETRY_LIMIT) {
        onStatusUpdate && onStatusUpdate('Fixing', { step: stepIndex, error: errors, retry: retryCount });
        logger.warn('Static check failed, calling StepFixerAgent', { traceId, step, errors, retryCount });
        sharedState.errors = errors;
        stepCode = await StepFixerAgent(sharedState, { logger, traceId, llmClient });
        logger.info('StepFixerAgent output', { traceId, step, stepCode, retryCount });
        sharedState.stepCode = stepCode;
        errors = StaticCheckerAgent(sharedState, { logger, traceId });
        logger.info('StaticCheckerAgent output after fix', { traceId, step, errors, retryCount });
        retryCount++;
      }
      if (errors.length > 0) {
        logger.error('Static validation failed after max retries, escalating to PlannerAgent or aborting', { traceId, step, errors });
        onStatusUpdate && onStatusUpdate('Error', { step: stepIndex, error: errors });
        throw new Error(`Static validation failed for step ${JSON.stringify(step)} after ${STATIC_FIX_RETRY_LIMIT} retries: ${errors.join('; ')}`);
      }
      // BlockInserterAgent
      sharedState.currentCode = await BlockInserterAgent(sharedState, { logger, traceId });
      logger.info('BlockInserterAgent output', { traceId, step, currentCode: sharedState.currentCode });
      onStatusUpdate && onStatusUpdate('Step', { step: stepIndex, status: 'done', label: step.label });
    }

    // 4. SyntaxSanityAgent
    onStatusUpdate && onStatusUpdate('SyntaxCheck');
    const syntaxResult = SyntaxSanityAgent(sharedState, { logger, traceId });
    logger.info('SyntaxSanityAgent output', { traceId, syntaxResult });
    onStatusUpdate && onStatusUpdate('SyntaxCheck', { status: 'done', syntaxResult });

    // 5. RuntimePlayabilityAgent
    onStatusUpdate && onStatusUpdate('RuntimeCheck');
    const runtimeResult = await RuntimePlayabilityAgent(sharedState, { logger, traceId });
    logger.info('RuntimePlayabilityAgent output', { traceId, runtimeResult });
    onStatusUpdate && onStatusUpdate('RuntimeCheck', { status: 'done', runtimeResult });

    // 6. FeedbackAgent
    onStatusUpdate && onStatusUpdate('Feedback');
    const feedback = await FeedbackAgent(sharedState, { logger, traceId, llmClient });
    logger.info('FeedbackAgent output', { traceId, feedback });
    onStatusUpdate && onStatusUpdate('Feedback', { status: 'done', feedback });

    logger.info('Pipeline finished', { traceId });

    // --- Save generated game to disk and update manifest ---
    const gameId = uuidv4();
    const gameName = sharedState.gameDef.title || title;
    const gameDate = new Date().toISOString();
    const fs = require('fs');
    const path = require('path');
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
    try {
      // Remove all code block markers from currentCode before saving
      const cleanCode = sharedState.currentCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
      fs.writeFileSync(path.join(gameFolder, 'game.js'), cleanCode, 'utf8');
    } catch (err) {
      logger.error('Failed to write game.js', { gameId, gameFolder, error: err });
      console.error('Failed to write game.js', path.join(gameFolder, 'game.js'), err);
      throw err;
    }
    try {
      const html = `<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>${gameName}</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head><body style='margin:0;background:#222;'><script src=\"game.js\"></script></body></html>`;
      fs.writeFileSync(path.join(gameFolder, 'index.html'), html, 'utf8');
    } catch (err) {
      logger.error('Failed to write index.html', { gameId, gameFolder, error: err });
      console.error('Failed to write index.html', path.join(gameFolder, 'index.html'), err);
      throw err;
    }
    // Update manifest
    if (!global.gamesManifest) global.gamesManifest = [];
    const gameMeta = { id: gameId, name: gameName, date: gameDate, url: `/games/${gameId}/` };
    global.gamesManifest.unshift(gameMeta);
    // Emit final SSE event if callback
    onStatusUpdate && onStatusUpdate('Done', { game: gameMeta });
    return {
      gameDef: sharedState.gameDef,
      plan: sharedState.plan,
      code: sharedState.currentCode,
      syntaxResult,
      runtimeResult,
      feedback,
      game: gameMeta
    };
  } catch (err) {
    logger.error('Pipeline error', { traceId, error: err, errorMessage: err && err.message, errorStack: err && err.stack });
    onStatusUpdate && onStatusUpdate('Error', { error: err.message, stack: err.stack });
    throw err;
  }
}

module.exports = { runPipeline }; 