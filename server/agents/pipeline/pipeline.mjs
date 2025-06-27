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
      const phase = payload.phase;
      if (!phase) {
        throw new Error('Progress event missing required "phase" property. All sub-pipelines must emit progress events with an explicit phase.');
      }
      // Accept only local progress (0-1)
      const localProgress = typeof payload.progress === 'number' ? payload.progress : 0;
      progressionManager.setPhase(phase);
      progressionManager.updateLocalProgress(localProgress);
      const unified = progressionManager.getUnifiedProgress();
      console.log(`[ORCHESTRATOR] Progress event: phase=${phase}, localProgress=${localProgress}, unified=${unified}`);
      if (frontendOnStatusUpdate) {
        // Canonical PipelineStatus event emission
        const phaseObj = typeof phase === 'object' ? phase : {
          name: phase,
          label: phase === 'planning' ? 'Planning' : 'Coding',
          description: phase === 'planning' ? 'Designing game' : 'Generating code'
        };
        frontendOnStatusUpdate('PipelineStatus', {
          type: 'PipelineStatus',
          phase: phaseObj,
          progress: unified,
          tokenCount: typeof sharedState.tokenCount === 'number' ? sharedState.tokenCount : 0,
          timestamp: new Date().toISOString()
        });
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

  // Ensure a final PipelineStatus event with progress=1.0 is always emitted
  if (frontendOnStatusUpdate) {
    const phaseObj = {
      name: 'coding',
      label: 'Coding',
      description: 'Generating code'
    };
    frontendOnStatusUpdate('PipelineStatus', {
      type: 'PipelineStatus',
      phase: phaseObj,
      progress: 1.0,
      tokenCount: typeof sharedState.tokenCount === 'number' ? sharedState.tokenCount : 0,
      timestamp: new Date().toISOString()
    });
  }
  return sharedState;
}

export { runModularGameSpecPipeline };