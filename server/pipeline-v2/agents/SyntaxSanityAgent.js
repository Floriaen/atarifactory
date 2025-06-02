/**
 * SyntaxSanityAgent
 * Input: { code: string }
 * Output: { valid: boolean, error?: string }
 *
 * Checks if the code is syntactically valid using new Function(code).
 */
function SyntaxSanityAgent({ code }) {
  // For the mock phase: if 'SYNTAX_ERROR' appears in code, return a fake error
  if (/SYNTAX_ERROR/.test(code)) {
    return { valid: false, error: 'Syntax error detected' };
  }
  return { valid: true };
}

module.exports = SyntaxSanityAgent; 