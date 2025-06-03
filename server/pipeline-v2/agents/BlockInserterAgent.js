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
function BlockInserterAgent({ currentCode, stepCode }, { logger, traceId }) {
  logger.info('BlockInserterAgent called', { traceId });
  try {
    // For the mock phase, just concatenate stepCode to currentCode
    return currentCode + '\n' + stepCode;
  } catch (err) {
    logger.error('BlockInserterAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = BlockInserterAgent; 