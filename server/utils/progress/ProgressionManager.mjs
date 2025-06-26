// ProgressionManager: Orchestrates unified pipeline progress and event emission
// See weightedProgress.js for pure progress utilities
import { computeWeightedProgress, getClampedLocalProgress } from './weightedProgress.js';

class ProgressionManager {
  constructor(weights) {
    if (typeof weights !== 'object' || Array.isArray(weights)) {
      throw new Error('weights must be an object with phase names as keys and weights as numbers');
    }
    this.weights = weights;
    this.currentChunk = null;
    this.localProgress = 0;
  }

  setPhase(phase) {
    this.currentChunk = phase;
    this.localProgress = 0;
  }

  updateLocalProgress(localProgress) {
    this.localProgress = localProgress;
  }

  getUnifiedProgress() {
    return computeWeightedProgress(this.weights, this.currentChunk, this.localProgress);
  }

  getClampedLocalProgress(step, total) {
    return getClampedLocalProgress(step, total);
  }
}

export { ProgressionManager };
