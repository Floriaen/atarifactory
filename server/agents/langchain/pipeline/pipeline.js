// Modular Game Spec Pipeline using LangChain v3 chains

// Orchestrator for the full modular pipeline (for legacy compatibility)
// Now simply delegates to planningPipeline and codingPipeline modules
const { runPlanningPipeline } = require('./planningPipeline');
const { runCodingPipeline } = require('./codingPipeline');

// Accepts a fully-formed sharedState object. Always runs both planning and coding pipelines.
// For partial execution (e.g. coding only), callers should use the split pipelines directly.
async function runModularGameSpecPipeline(sharedState) {
  await runPlanningPipeline(sharedState);
  await runCodingPipeline(sharedState);
  return sharedState;
}

module.exports = { runModularGameSpecPipeline };