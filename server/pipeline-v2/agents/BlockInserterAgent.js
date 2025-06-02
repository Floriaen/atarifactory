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
  // Mock implementation for contract test
  return `${currentCode}\n${stepCode}`;
}

module.exports = BlockInserterAgent; 