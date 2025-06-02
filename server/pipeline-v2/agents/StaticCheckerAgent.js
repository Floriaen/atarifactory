/**
 * StaticCheckerAgent
 * Input: {
 *   currentCode: string,
 *   stepCode: string
 * }
 * Output: Array<string> (list of errors: duplicate declarations, undeclared variables, syntax issues)
 *
 * Performs static analysis on the code.
 */
function StaticCheckerAgent({ currentCode, stepCode }) {
  // For the mock phase: if 'DUPLICATE' appears in code, return a fake error
  const code = currentCode + '\n' + stepCode;
  if (/DUPLICATE/.test(code)) {
    return ['Duplicate declaration detected'];
  }
  return [];
}

module.exports = StaticCheckerAgent; 