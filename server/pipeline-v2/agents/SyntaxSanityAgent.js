/**
 * SyntaxSanityAgent
 * Input: { code: string }
 * Output: { valid: boolean, error?: string }
 *
 * Checks if the code is syntactically valid using new Function(code).
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
function SyntaxSanityAgent({ code }, { logger, traceId }) {
  logger.info('SyntaxSanityAgent called', { traceId });
  try {
    // Real syntax check using new Function
    new Function(code);
    return { valid: true };
  } catch (err) {
    logger.error('SyntaxSanityAgent syntax error', { traceId, error: err });
    return { valid: false, error: err.message };
  }
}

module.exports = SyntaxSanityAgent; 