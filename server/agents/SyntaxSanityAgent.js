/**
 * SyntaxSanityAgent
 * Input: SharedState
 * Output: { valid: boolean, error?: string }
 *
 * Checks if the code is syntactically valid using new Function(code).
 */
// IMPORTANT: This agent must NOT use LLM for syntax checking.
function SyntaxSanityAgent(sharedState, { logger, traceId }) {
  logger.info('SyntaxSanityAgent called', { traceId });
  try {
    // Real syntax check using new Function
    new Function(sharedState.currentCode);
    return { valid: true };
  } catch (err) {
    logger.error('SyntaxSanityAgent syntax error', { traceId, error: err });
    return { valid: false, error: err.message };
  }
}

module.exports = SyntaxSanityAgent; 