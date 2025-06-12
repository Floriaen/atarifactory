/**
 * BlockInserterAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - stepCode: string - The code block to insert
 * Output: string (new currentCode after safe insertion/merge)
 *
 * Uses AST-based code manipulation to insert/merge stepCode into currentCode.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const { mergeCode } = require('../utils/codeMerge');
const prettier = require('prettier');

const mergeAndFormat = async (currentCode, stepCode, logger) => {
  try {
    // First merge using the codeMerge utility
    const mergedCode = await mergeCode(currentCode, stepCode);
    
    // Format the merged code
    const formattedCode = await prettier.format(mergedCode, {
      parser: 'babel',
      singleQuote: false,
      trailingComma: 'none',
      tabWidth: 2
    });

    return formattedCode;
  } catch (error) {
    if (logger) logger.error('Error in mergeAndFormat:', { error, service: 'pipeline-v2' });
    // Fallback to simple concatenation if merge fails
    return `${currentCode}\n${stepCode}`;
  }
};

async function BlockInserterAgent(sharedState, { logger, traceId }) {
  const { currentCode, stepCode } = sharedState;

  logger.info('codeMerge input:', { currentCode, stepCode, service: 'pipeline-v2', timestamp: new Date().toISOString() });


  try {
    const result = await mergeAndFormat(currentCode, stepCode, logger);
    logger.info('codeMerge output:', { mergedCode: result, service: 'pipeline-v2', timestamp: new Date().toISOString() });

    // Update shared state
    sharedState.currentCode = result;
    sharedState.metadata.lastUpdate = new Date();

    return result;
  } catch (error) {
    logger.error('codeMerge parsing failed:', error);
    // If parsing fails, fall back to simple concatenation
    const fallbackCode = `${currentCode}\n${stepCode}`;
    logger.info('codeMerge fallback output:', { fallbackCode });

    // Update shared state with fallback
    sharedState.currentCode = fallbackCode;
    sharedState.metadata.lastUpdate = new Date();

    return fallbackCode;
  }
}

module.exports = BlockInserterAgent;