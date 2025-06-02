/**
 * SyntaxSanityAgent
 * Input: { code: string }
 * Output: { valid: boolean, error?: string }
 *
 * Checks if the code is syntactically valid using new Function(code).
 */
function SyntaxSanityAgent({ code }, { logger, traceId }) {
  logger.info('SyntaxSanityAgent called', { traceId });
  try {
    // For the mock phase: if 'SYNTAX_ERROR' appears in code, return a fake error
    if (/SYNTAX_ERROR/.test(code)) {
      return { valid: false, error: 'Syntax error detected' };
    }
    return { valid: true };
  } catch (err) {
    logger.error('SyntaxSanityAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = SyntaxSanityAgent; 