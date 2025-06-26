// Modular Game Spec Pipeline using LangChain v3 chains

// Orchestrator for the full modular pipeline.
// Delegates to planningPipeline and codingPipeline modules; progress is fully decoupled and unified only at this layer.
import { runPlanningPipeline } from './planningPipeline.mjs';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.mjs';

// Accepts a fully-formed sharedState object. Always runs both planning and coding pipelines.
// Sub-pipelines emit only local progress (0–1); orchestrator maps to unified progress for frontend.
// For partial execution (e.g. coding only), callers should use the split pipelines directly.
import { PROGRESS_WEIGHTS } from '../../config/pipeline.config.mjs';
// Uses centrally defined PROGRESS_WEIGHTS from pipeline.config.js
async function runModularGameSpecPipeline(sharedState) {
  // Set up ProgressionManager for unified progress
  const progressionManager = new ProgressionManager(PROGRESS_WEIGHTS);

  // Wire up orchestrator-level onStatusUpdate
  const frontendOnStatusUpdate = sharedState.onStatusUpdate || undefined;
  function orchestratorOnStatusUpdate(type, payload) {
    if (type === 'Progress') {
      // Determine which phase emitted this progress
      // If planning pipeline is running, treat as 'planning', else 'coding'
      // We'll pass a 'phase' property in payload from each pipeline for clarity (future-proofing)
      let phase = payload.phase;
      if (!phase) {
        // Heuristic: before plan is set, it's planning; after, it's coding
        phase = Array.isArray(sharedState.plan) ? 'coding' : 'planning';
      }
      // Accept only local progress (0-1)
      const localProgress = typeof payload.progress === 'number' ? payload.progress : 0;
      progressionManager.setPhase(phase);
      progressionManager.updateLocalProgress(localProgress);
      const unified = progressionManager.getUnifiedProgress();
      console.log(`[ORCHESTRATOR] Progress event: phase=${phase}, localProgress=${localProgress}, unified=${unified}`);
      if (frontendOnStatusUpdate) {
        frontendOnStatusUpdate('Progress', { progress: unified });
      }
    } else {
      // Forward all other events directly
      if (frontendOnStatusUpdate) frontendOnStatusUpdate(type, payload);
    }
  }

  // Run planning pipeline (local progress events intercepted)
  await runPlanningPipeline(sharedState, orchestratorOnStatusUpdate);
  console.debug('[pipeline] sharedState after planning:', JSON.stringify(sharedState, null, 2));

  // Dynamically import runCodingPipeline from ESM module
  const { runCodingPipeline } = await import('./codingPipeline.mjs');
  await runCodingPipeline(sharedState, orchestratorOnStatusUpdate);
  console.debug('[pipeline] sharedState after coding:', JSON.stringify(sharedState, null, 2));
  return sharedState;
}

export { runModularGameSpecPipeline };