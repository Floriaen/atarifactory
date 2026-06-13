import { statusLogger } from './logger.js';

/**
 * PipelineTracker - Automatically tracks and reports granular pipeline progress
 * 
 * This class eliminates the need for manual status updates by automatically
 * discovering chain status information and emitting detailed progress events.
 */
export class PipelineTracker {
  constructor(phaseName, phaseLabel, phaseDescription, onStatusUpdate) {
    this.phaseName = phaseName;
    this.phaseLabel = phaseLabel;
    this.phaseDescription = phaseDescription;
    this.onStatusUpdate = onStatusUpdate;
    this.currentStep = 0;
    this.steps = [];
    this.startTime = Date.now();
  }

  /**
   * Register a step with the tracker
   * @param {Object} stepInfo - Step information
   * @param {string} stepInfo.name - Technical step name
   * @param {string} stepInfo.label - User-friendly step label
   * @param {string} stepInfo.description - Step description
   * @param {number} stepInfo.weight - Step weight (0-1, default 1/totalSteps)
   */
  addStep(stepInfo) {
    this.steps.push({
      name: stepInfo.name,
      label: stepInfo.label,
      description: stepInfo.description,
      weight: stepInfo.weight || (1 / this.steps.length),
      startTime: null,
      endTime: null
    });
  }

  /**
   * Add multiple steps at once
   * @param {Array} steps - Array of step info objects
   */
  addSteps(steps) {
    // Normalize weights to sum to 1.0
    const totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
    
    steps.forEach(step => {
      this.addStep({
        ...step,
        weight: (step.weight || 1) / totalWeight
      });
    });
  }

  /**
   * Execute a step with automatic progress tracking
   * @param {Function} stepFunction - Async function to execute
   * @param {Object} stepInfo - Step information (name, label, description)
   * @param {Object} context - Context data (sharedState, etc.)
   * @returns {Promise} - Result of step execution
   */
  async executeStep(stepFunction, stepInfo, context = {}) {
    const step = this.steps[this.currentStep];
    if (!step) {
      throw new Error(`Step ${this.currentStep} not found in tracker`);
    }

    // Update step info if provided
    if (stepInfo) {
      step.name = stepInfo.name || step.name;
      step.label = stepInfo.label || step.label;
      step.description = stepInfo.description || step.description;
    }

    // Emit step start event
    step.startTime = Date.now();
    this.emitStepProgress(step, 0, 'started', null, context);

    try {
      // Execute the step
      const result = await stepFunction(context);
      
      // Emit step completion event with updated context (tokenCount may have changed)
      step.endTime = Date.now();
      this.emitStepProgress(step, 1, 'completed', null, context);
      
      this.currentStep++;
      return result;
    } catch (error) {
      // Emit step error event
      step.endTime = Date.now();
      this.emitStepProgress(step, 0, 'error', error, context);
      throw error;
    }
  }

  /**
   * Execute a chain with automatic status detection
   * @param {Function} chainFactory - Function that creates the chain
   * @param {Object} chainInput - Input for the chain
   * @param {Object} context - Context data
   * @returns {Promise} - Chain execution result
   */
  async executeChain(chainFactory, chainInput, context = {}) {
    const chain = await chainFactory(context.llm, context.options);
    
    // Try to get chain status information
    let chainStatus = null;
    if (chainFactory.CHAIN_STATUS) {
      chainStatus = chainFactory.CHAIN_STATUS;
    } else {
      // Look for CHAIN_STATUS in the module
      const modulePath = chainFactory.toString();
      // This is a fallback - ideally all chains should export CHAIN_STATUS
      chainStatus = {
        name: chainFactory.name.replace('create', '').replace('Chain', '') + 'Chain',
        label: chainFactory.name.replace('create', '').replace('Chain', ''),
        description: 'Processing...',
        category: this.phaseName
      };
    }

    return await this.executeStep(
      async (ctx) => await chain.invoke(chainInput),
      chainStatus,
      context
    );
  }

  /**
   * Emit step progress event
   * @param {Object} step - Step information
   * @param {number} stepProgress - Step progress (0-1)
   * @param {string} status - Step status (started, completed, error)
   * @param {Error} error - Error if status is 'error'
   * @param {Object} context - Context data
   */
  emitStepProgress(step, stepProgress, status, error = null, context = {}) {
    // Calculate overall progress
    const completedSteps = this.currentStep;
    const currentStepProgress = stepProgress * (step.weight || 1);
    const totalProgress = this.steps.slice(0, completedSteps)
      .reduce((sum, s) => sum + (s.weight || 1), 0) + currentStepProgress;

    const progressEvent = {
      phase: {
        name: this.phaseName,
        label: step.label,
        description: step.description,
        stepName: step.name,
        stepStatus: status,
        stepProgress: stepProgress,
        totalProgress: Math.min(totalProgress, 1.0)
      },
      progress: Math.min(totalProgress, 1.0),
      tokenCount: context.sharedState?.tokenCount || 0,
      timestamp: new Date().toISOString()
    };

    // Add error information if present
    if (error) {
      progressEvent.error = {
        message: error.message,
        stack: error.stack
      };
    }

    // Log the event
    statusLogger.info('PipelineTracker step progress', {
      eventType: 'StepProgress',
      phase: this.phaseName,
      stepName: step.name,
      stepLabel: step.label,
      stepProgress: stepProgress,
      totalProgress: progressEvent.progress,
      status: status,
      error: error?.message
    });

    // Emit to pipeline
    if (this.onStatusUpdate) {
      this.onStatusUpdate('Progress', progressEvent);
    }
  }

  /**
   * Get current progress summary
   * @returns {Object} - Progress summary
   */
  getProgressSummary() {
    return {
      phaseName: this.phaseName,
      phaseLabel: this.phaseLabel,
      phaseDescription: this.phaseDescription,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      overallProgress: this.currentStep / this.steps.length,
      elapsedTime: Date.now() - this.startTime,
      steps: this.steps.map(step => ({
        name: step.name,
        label: step.label,
        description: step.description,
        weight: step.weight,
        completed: step.endTime !== null,
        duration: step.endTime ? (step.endTime - step.startTime) : null
      }))
    };
  }
}

/**
 * Create a pipeline tracker for a specific phase
 * @param {string} phaseName - Technical phase name
 * @param {string} phaseLabel - User-friendly phase label
 * @param {string} phaseDescription - Phase description
 * @param {Function} onStatusUpdate - Status update callback
 * @returns {PipelineTracker} - New tracker instance
 */
export function createPipelineTracker(phaseName, phaseLabel, phaseDescription, onStatusUpdate) {
  return new PipelineTracker(phaseName, phaseLabel, phaseDescription, onStatusUpdate);
}