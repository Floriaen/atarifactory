/**
 * BlockInserterAgent
 * Input: {
 *   currentCode: string,
 *   stepCode: string
 * }
 * Output: string (new currentCode after safe insertion/merge)
 *
 * Uses AST-based code manipulation to insert/merge stepCode into currentCode.
 */
function BlockInserterAgent({ currentCode, stepCode }) {
  // For the mock phase, just concatenate stepCode to currentCode
  return currentCode + '\n' + stepCode;
}

module.exports = BlockInserterAgent; 