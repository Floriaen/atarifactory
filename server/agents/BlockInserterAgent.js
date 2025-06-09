const { mergeCode } = require('../code-merge-module');
const prettier = require('prettier');

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
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
async function BlockInserterAgent({ currentCode, stepCode }, { logger, traceId }) {
  logger.info('BlockInserterAgent called', { traceId });
  try {
    // Use the new code-merge-module with ast-merge
    const merged = await mergeCode(currentCode, stepCode);
    
    // Format the merged code
    const formatted = prettier.format(merged, { parser: 'babel' });
    return formatted;
  } catch (err) {
    logger.error('BlockInserterAgent error', { traceId, error: err });
    return currentCode + '\n' + stepCode;
  }
}

module.exports = BlockInserterAgent; 