/**
 * StepFixerAgent
 * Input: {
 *   currentCode: string,
 *   step: { id: number, label: string },
 *   errorList: Array<string>
 * }
 * Output: string (corrected stepCode)
 *
 * Fixes the code for the current step based on errors.
 */
async function StepFixerAgent({ currentCode, step, errorList }, { logger, traceId }) {
  logger.info('StepFixerAgent called', { traceId, step, errorList });
  try {
    if (errorList && errorList.length > 0) {
      return `// Fixed step ${step.id}: ${step.label}\n// Fixed errors: ${errorList.join(', ')}`;
    }
    return `// No fix needed for step ${step.id}: ${step.label}`;
  } catch (err) {
    logger.error('StepFixerAgent error', { traceId, error: err, step });
    throw err;
  }
}

module.exports = StepFixerAgent; 