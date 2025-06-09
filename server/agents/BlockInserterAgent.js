const { mergeCode } = require('ast-merge');
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
    // Log input before merging
    console.log('--- MERGE INPUT ---');
    console.log('currentCode:', currentCode);
    console.log('stepCode:', stepCode);

    let mergedCode;
    try {
      mergedCode = await mergeCode(currentCode, stepCode, 'js');
    } catch (e) {
      logger.error('Error in mergeCode:', e);
      throw e;
    }

    // Log output after merging
    console.log('--- MERGE OUTPUT ---');
    console.log('mergedCode:', mergedCode);
    
    // Format the merged code
    const formatted = prettier.format(mergedCode, { parser: 'babel' });
    return formatted;
  } catch (err) {
    logger.error('BlockInserterAgent error', { traceId, error: err });
    return currentCode + '\n' + stepCode;
  }
}

module.exports = BlockInserterAgent; 