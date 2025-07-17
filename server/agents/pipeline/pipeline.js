// Modular Game Spec Pipeline using LangChain v3 chains

// Orchestrator for the full modular pipeline.
// Delegates to planningPipeline and codingPipeline modules; progress is fully decoupled and unified only at this layer.
import { runPlanningPipeline } from './planningPipeline.js';
import { runCodingPipeline } from './codingPipeline.js';
import { ProgressionManager } from '../../utils/progress/ProgressionManager.js';
import logger, { statusLogger } from '../../utils/logger.js';

// Accepts a fully-formed sharedState object. Always runs both planning and coding pipelines.
// Sub-pipelines emit only local progress (0–1); orchestrator maps to unified progress for frontend.
// For partial execution (e.g. coding only), callers should use the split pipelines directly.
import { PROGRESS_WEIGHTS } from '../../config/pipeline.config.js';
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
      logger.debug('Orchestrator progress event', { phase, localProgress, unified });
      if (frontendOnStatusUpdate) {
        // Canonical PipelineStatus event emission
        if (
          typeof phase !== 'object' ||
          typeof phase.name !== 'string' ||
          typeof phase.label !== 'string' ||
          typeof phase.description !== 'string'
        ) {
          throw new Error('Progress event phase must be a canonical object with { name, label, description }. Received: ' + JSON.stringify(phase));
        }
        const phaseObj = phase;
        const statusEvent = {
          type: 'PipelineStatus',
          phase: phaseObj,
          progress: unified,
          tokenCount: typeof payload.tokenCount === 'number' ? payload.tokenCount : 0,
          timestamp: new Date().toISOString()
        };
        
        // Log all PipelineStatus events
        statusLogger.info('PipelineStatus event', {
          eventType: 'PipelineStatus',
          phase: phaseObj,
          progress: unified,
          tokenCount: statusEvent.tokenCount,
          originalPayload: payload
        });
        
        frontendOnStatusUpdate('PipelineStatus', statusEvent);
      }
    } else {
      // Log all other events
      statusLogger.info('Pipeline event', {
        eventType: type,
        payload: payload
      });
      
      // Forward all other events directly
      if (frontendOnStatusUpdate) frontendOnStatusUpdate(type, payload);
    }
  }

  // Run planning pipeline (local progress events intercepted)
  await runPlanningPipeline(sharedState, orchestratorOnStatusUpdate);
  logger.debug('SharedState after planning', { sharedState });

  // Run coding pipeline (runCodingPipeline is now imported at the top)
  await runCodingPipeline(sharedState, orchestratorOnStatusUpdate);
  logger.debug('SharedState after coding', { sharedState });

  // Ensure a final PipelineStatus event with progress=1.0 is always emitted
  if (frontendOnStatusUpdate) {
    const phaseObj = {
      name: 'coding',
      label: 'Coding',
      description: 'Generating code'
    };
    const finalEvent = {
      type: 'PipelineStatus',
      phase: phaseObj,
      progress: 1.0,
      tokenCount: typeof sharedState.tokenCount === 'number' ? sharedState.tokenCount : 0,
      timestamp: new Date().toISOString()
    };
    
    // Log final PipelineStatus event
    statusLogger.info('Final PipelineStatus event', {
      eventType: 'PipelineStatus',
      phase: phaseObj,
      progress: 1.0,
      tokenCount: finalEvent.tokenCount,
      isFinalEvent: true
    });
    
    frontendOnStatusUpdate('PipelineStatus', finalEvent);
  }
  return sharedState;
}

export { runModularGameSpecPipeline };