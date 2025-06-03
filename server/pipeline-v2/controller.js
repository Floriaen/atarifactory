const GameDesignAgent = require('./agents/GameDesignAgent');
const PlannerAgent = require('./agents/PlannerAgent');
const StepBuilderAgent = require('./agents/StepBuilderAgent');
const StaticCheckerAgent = require('./agents/StaticCheckerAgent');
const StepFixerAgent = require('./agents/StepFixerAgent');
const BlockInserterAgent = require('./agents/BlockInserterAgent');
const SyntaxSanityAgent = require('./agents/SyntaxSanityAgent');
const RuntimePlayabilityAgent = require('./agents/RuntimePlayabilityAgent');
const FeedbackAgent = require('./agents/FeedbackAgent');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');
const SmartOpenAI = require('./utils/SmartOpenAI');
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
 * @returns {Promise<object>} - The final pipeline result
 */
async function runPipeline(title) {
  const traceId = uuidv4();
  logger.info('Pipeline started', { traceId, title });
  try {
    // 1. GameDesignAgent
    const gameDef = await GameDesignAgent({ title }, { logger, traceId, llmClient });
    logger.info('GameDesignAgent output', { traceId, gameDef });

    // 2. PlannerAgent
    const plan = await PlannerAgent(gameDef, { logger, traceId, llmClient });
    logger.info('PlannerAgent output', { traceId, plan });

    // 3. Step execution cycle
    let currentCode = '';
    for (const step of plan) {
      logger.info('Step execution', { traceId, step });
      // StepBuilderAgent
      let stepCode = await StepBuilderAgent({ currentCode, plan, step }, { logger, traceId, llmClient });
      logger.info('StepBuilderAgent output', { traceId, step, stepCode });
      // StaticCheckerAgent
      let errors = StaticCheckerAgent({ currentCode, stepCode }, { logger, traceId });
      logger.info('StaticCheckerAgent output', { traceId, step, errors });
      // StepFixerAgent (if needed)
      if (errors.length > 0) {
        stepCode = await StepFixerAgent({ currentCode, step, errorList: errors }, { logger, traceId, llmClient });
        logger.info('StepFixerAgent output', { traceId, step, stepCode });
      }
      // BlockInserterAgent
      currentCode = BlockInserterAgent({ currentCode, stepCode }, { logger, traceId });
      logger.info('BlockInserterAgent output', { traceId, step, currentCode });
    }

    // 4. SyntaxSanityAgent
    const syntaxResult = SyntaxSanityAgent({ code: currentCode }, { logger, traceId });
    logger.info('SyntaxSanityAgent output', { traceId, syntaxResult });

    // 5. RuntimePlayabilityAgent
    const runtimeResult = await RuntimePlayabilityAgent({ code: currentCode }, { logger, traceId });
    logger.info('RuntimePlayabilityAgent output', { traceId, runtimeResult });

    // 6. FeedbackAgent
    const feedback = FeedbackAgent({ runtimeLogs: runtimeResult, stepId: plan.length }, { logger, traceId });
    logger.info('FeedbackAgent output', { traceId, feedback });

    logger.info('Pipeline finished', { traceId });
    return {
      gameDef,
      plan,
      code: currentCode,
      syntaxResult,
      runtimeResult,
      feedback
    };
  } catch (err) {
    logger.error('Pipeline error', { traceId, error: err });
    throw err;
  }
}

module.exports = { runPipeline }; 