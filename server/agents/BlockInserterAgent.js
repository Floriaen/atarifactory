// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const { mergeCode } = require('../utils/codeMerge');
const prettier = require('prettier');
const logger = require('../utils/logger');

/**
 * BlockInserterAgent
 * Input: SharedState
 * Output: string (new currentCode after safe insertion/merge)
 *
 * Uses AST-based code manipulation to insert/merge stepCode into currentCode.
 */
async function BlockInserterAgent(sharedState, { logger, traceId }) {
  logger.info('BlockInserterAgent called', { traceId });
  
  try {
    // Merge the code using our new module
    const mergedCode = await mergeCode(sharedState.currentCode, sharedState.stepCode);
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
    
    // Update sharedState
    sharedState.currentCode = formattedCode;
    if (!sharedState.metadata) {
      sharedState.metadata = {};
    }
    sharedState.metadata.lastUpdate = new Date();
    
    logger.info('BlockInserterAgent output', { traceId, formattedCode });
    return formattedCode;
  } catch (error) {
    logger.error('Error in BlockInserterAgent:', error);
    throw error;
  }
}

module.exports = BlockInserterAgent; 