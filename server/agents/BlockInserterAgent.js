const { mergeCode } = require('../utils/codeMerge');
const prettier = require('prettier');
const logger = require('../utils/logger');

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
    // Merge the code using our new module
    const mergedCode = await mergeCode(currentCode, stepCode);
    logger.info('Merged code before formatting:', { traceId, mergedCode });
    
    // Format the merged code
    let formattedCode;
    try {
      formattedCode = prettier.format(mergedCode, {
        parser: 'babel',
        semi: true,
        singleQuote: false,
        trailingComma: 'es5',
      });
    } catch (formatError) {
      // If formatting fails, return the raw merged code
      logger.error('Prettier formatting failed:', formatError);
      formattedCode = mergedCode;
    }
    
    logger.info('BlockInserterAgent output', { traceId, formattedCode });
    return formattedCode;
  } catch (error) {
    logger.error('Error in BlockInserterAgent:', error);
    throw error;
  }
}

module.exports = BlockInserterAgent; 