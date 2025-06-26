// Modular Game Spec Pipeline using LangChain v3 chains

// Orchestrator for the full modular pipeline (for legacy compatibility)
// Now simply delegates to planningPipeline and codingPipeline modules
import { runPlanningPipeline } from './planningPipeline.mjs';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.mjs';

// Accepts a fully-formed sharedState object. Always runs both planning and coding pipelines.
// For partial execution (e.g. coding only), callers should use the split pipelines directly.
async function runModularGameSpecPipeline(sharedState, config = {}) {
  // Configurable progress weights (defaults: planning 0.3, coding 0.7)
  const planningWeight = typeof config.planningWeight === 'number' ? config.planningWeight : 0.3;
  const codingWeight = typeof config.codingWeight === 'number' ? config.codingWeight : 0.7;

  // Set up ProgressionManager for unified progress
  const progressionManager = new ProgressionManager({
    planning: planningWeight,
    coding: codingWeight,
  });

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
  await runPlanningPipeline(sharedState, orchestratorOnStatusUpdate, 0, 100, { planningWeight, codingWeight });
  console.debug('[pipeline] sharedState after planning:', JSON.stringify(sharedState, null, 2));

  // Calculate dynamic step counts
  const planningPhases = 5; // GameInventor, GameDesign, PlayabilityValidator, PlayabilityHeuristic, Planner
  const planSteps = Array.isArray(sharedState.plan) ? sharedState.plan.length : 0;
  const codingPhases = 3; // Feedback, StaticChecker, Complete
  const codingSteps = planSteps + codingPhases;
  const totalSteps = planningPhases + codingSteps;

  // Dynamically import runCodingPipeline from ESM module
  const { runCodingPipeline } = await import('./codingPipeline.mjs');
  await runCodingPipeline(sharedState, orchestratorOnStatusUpdate, {}, planningPhases, totalSteps, { planningWeight, codingWeight });
  console.debug('[pipeline] sharedState after coding:', JSON.stringify(sharedState, null, 2));
  return sharedState;
}

export { runModularGameSpecPipeline };