// ProgressionManager: Orchestrates unified pipeline progress and event emission
// See weightedProgress.js for pure progress utilities
import { getClampedLocalProgress } from './weightedProgress.js';

const WEIGHT_SUM_TOLERANCE = 1e-6;

class ProgressionManager {
  constructor(phaseWeights) {
    this._phases = this._normalizePhaseWeights(phaseWeights);
    this._weightsByName = new Map();

    let totalWeight = 0;
    for (const { name, weight } of this._phases) {
      if (this._weightsByName.has(name)) {
        throw new Error(`Duplicate phase "${name}" supplied to ProgressionManager`);
      }
      this._weightsByName.set(name, weight);
      totalWeight += weight;
    }

    if (Math.abs(totalWeight - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new Error(`ProgressionManager weights must sum to 1. Received ${totalWeight}`);
    }

    this.reset();
  }

  _normalizePhaseWeights(phaseWeights) {
    if (Array.isArray(phaseWeights)) {
      return phaseWeights.map((entry) => this._validatePhaseEntry(entry));
    }

    if (phaseWeights && typeof phaseWeights === 'object') {
      return Object.entries(phaseWeights).map(([name, weight]) => this._validatePhaseEntry({ name, weight }));
    }

    throw new Error('ProgressionManager requires an array or object of phase weights');
  }

  _validatePhaseEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Each phase entry must be an object with name and weight');
    }

    const { name, weight } = entry;

    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Phase entry must include a non-empty string name');
    }

    if (typeof weight !== 'number' || Number.isNaN(weight)) {
      throw new Error(`Phase "${name}" must provide a numeric weight`);
    }

    if (weight < 0) {
      throw new Error(`Phase "${name}" weight must be non-negative`);
    }

    return { name, weight };
  }

  reset() {
    this._currentPhase = null;
    this._phaseProgress = new Map();
    for (const { name } of this._phases) {
      this._phaseProgress.set(name, 0);
    }
  }

  setPhase(phase) {
    const name = this._resolvePhaseName(phase);
    this._assertKnownPhase(name);
    this._currentPhase = name;
  }

  updateLocalProgress(localProgress) {
    if (!this._currentPhase) {
      throw new Error('No current phase set. Call setPhase() before updateLocalProgress().');
    }
    this._setPhaseProgress(this._currentPhase, localProgress);
  }

  updatePhaseProgress(phase, progress) {
    const name = this._resolvePhaseName(phase);
    this._setPhaseProgress(name, progress);
  }

  getUnifiedProgress() {
    let total = 0;
    for (const { name, weight } of this._phases) {
      const progress = this._phaseProgress.get(name) ?? 0;
      total += weight * progress;
    }
    return Math.min(1, total);
  }

  getClampedLocalProgress(step, total) {
    return getClampedLocalProgress(step, total);
  }

  _resolvePhaseName(phase) {
    if (typeof phase === 'string') {
      return phase;
    }
    if (phase && typeof phase === 'object' && typeof phase.name === 'string') {
      return phase.name;
    }
    throw new Error('Phase reference must be a string name or an object containing a name property');
  }

  _setPhaseProgress(name, progress) {
    this._assertKnownPhase(name);
    this._assertProgressValue(progress);
    this._phaseProgress.set(name, progress);
  }

  _assertKnownPhase(name) {
    if (!this._weightsByName.has(name)) {
      throw new Error(`Unknown phase "${name}"`);
    }
  }

  _assertProgressValue(progress) {
    if (typeof progress !== 'number' || Number.isNaN(progress) || progress < 0 || progress > 1) {
      throw new Error('Progress value must be between 0 and 1 inclusive');
    }
  }
}

export { ProgressionManager };
