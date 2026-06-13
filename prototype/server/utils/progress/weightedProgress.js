/**
 * Compute unified progress for a pipeline split into weighted chunks (phases).
 *
 * @param {number[]} weights - Array of chunk weights (must sum to 1.0).
 * @param {number} currentChunkIndex - Index of the current chunk (0-based).
 * @param {number} localProgress - Progress within the current chunk (0.0–1.0).
 * @returns {number} Overall progress (0.0–1.0)
 *
 * @example
 *   // 3 chunks: planning 20%, validation 10%, coding 70%
 *   const weights = [0.2, 0.1, 0.7];
 *   // During validation, 50% done:
 *   computeWeightedProgress(weights, 1, 0.5); // => 0.25 (25%)
 */
/**
 * Compute unified progress using named chunks.
 *
 * @param {Object} weights - Object of chunk weights (must sum to 1.0).
 * @param {string} currentChunk - Name of the current chunk.
 * @param {number} localProgress - Progress within the chunk (0.0–1.0).
 * @returns {number} Overall progress (0.0–1.0)
 *
 * @example
 *   const weights = { planning: 0.2, validation: 0.1, coding: 0.7 };
 *   computeWeightedProgress(weights, 'validation', 0.5); // => 0.25
 */
function computeWeightedProgress(weights, currentChunk, localProgress) {
  if (typeof weights !== 'object' || Array.isArray(weights)) throw new Error('weights must be an object');
  if (!(currentChunk in weights)) throw new Error('Unknown chunk name');
  if (localProgress < 0 || localProgress > 1) throw new Error('localProgress must be in [0,1]');
  let progress = 0;
  for (const [name, weight] of Object.entries(weights)) {
    if (name === currentChunk) break;
    progress += weight;
  }
  progress += weights[currentChunk] * localProgress;
  return Math.round(progress * 100) / 100;
}

/**
 * Clamp local progress to just below 1.0 except at the very end.
 * @param {number} step - Current step (1-based or 0-based, as used consistently in pipeline)
 * @param {number} total - Total steps
 * @returns {number} Clamped progress (never emits 1.0 except at the very end)
 */
function getClampedLocalProgress(step, total) {
  let p = step / total;
  return p >= 1.0 ? 0.99 : p;
}

export {
  computeWeightedProgress,
  getClampedLocalProgress
};
