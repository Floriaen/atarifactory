// Modular Game Spec Pipeline using LangChain v3 chains

// Orchestrator for the full modular pipeline (for legacy compatibility)
// Now simply delegates to planningPipeline and codingPipeline modules
import { runPlanningPipeline } from './planningPipeline.mjs';
// Run coding pipeline (ESM) using dynamic import in ESM context

// Accepts a fully-formed sharedState object. Always runs both planning and coding pipelines.
// For partial execution (e.g. coding only), callers should use the split pipelines directly.
async function runModularGameSpecPipeline(sharedState) {
  await runPlanningPipeline(sharedState);
  console.debug('[pipeline] sharedState after planning:', JSON.stringify(sharedState, null, 2));
  // Dynamically import runCodingPipeline from CJS module
  const codingPipelineModule = await import('./codingPipeline.mjs');
  await codingPipelineModule.runCodingPipeline(sharedState);
  console.debug('[pipeline] sharedState after coding:', JSON.stringify(sharedState, null, 2));
  return sharedState;
}

export { runModularGameSpecPipeline };