const GameDesignAgent = require('./agents/GameDesignAgent');
const PlannerAgent = require('./agents/PlannerAgent');
const StepBuilderAgent = require('./agents/StepBuilderAgent');
const StaticCheckerAgent = require('./agents/StaticCheckerAgent');
const StepFixerAgent = require('./agents/StepFixerAgent');
const BlockInserterAgent = require('./agents/BlockInserterAgent');
const SyntaxSanityAgent = require('./agents/SyntaxSanityAgent');
const RuntimePlayabilityAgent = require('./agents/RuntimePlayabilityAgent');
const FeedbackAgent = require('./agents/FeedbackAgent');

/**
 * Orchestrates the agent pipeline for game generation.
 * @param {string} title - The game title
 * @returns {Promise<object>} - The final pipeline result
 */
async function runPipeline(title) {
  // 1. GameDesignAgent
  const gameDef = await GameDesignAgent({ title });

  // 2. PlannerAgent
  const plan = await PlannerAgent(gameDef);

  // 3. Step execution cycle
  let currentCode = '';
  for (const step of plan) {
    // StepBuilderAgent
    let stepCode = await StepBuilderAgent({ currentCode, plan, step });
    // StaticCheckerAgent
    let errors = StaticCheckerAgent({ currentCode, stepCode });
    // StepFixerAgent (if needed)
    if (errors.length > 0) {
      stepCode = await StepFixerAgent({ currentCode, step, errorList: errors });
    }
    // BlockInserterAgent
    currentCode = BlockInserterAgent({ currentCode, stepCode });
  }

  // 4. SyntaxSanityAgent
  const syntaxResult = SyntaxSanityAgent({ code: currentCode });

  // 5. RuntimePlayabilityAgent
  const runtimeResult = await RuntimePlayabilityAgent({ code: currentCode });

  // 6. FeedbackAgent
  const feedback = FeedbackAgent({ runtimeLogs: runtimeResult, stepId: plan.length });

  return {
    gameDef,
    plan,
    code: currentCode,
    syntaxResult,
    runtimeResult,
    feedback
  };
}

module.exports = { runPipeline }; 