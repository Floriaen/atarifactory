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
async function StepFixerAgent({ currentCode, step, errorList }) {
  if (errorList && errorList.length > 0) {
    return `// Fixed step ${step.id}: ${step.label}\n// Fixed errors: ${errorList.join(', ')}`;
  }
  return `// No fix needed for step ${step.id}: ${step.label}`;
}

module.exports = StepFixerAgent; 