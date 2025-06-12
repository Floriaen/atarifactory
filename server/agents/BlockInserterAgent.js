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
const logger = require('../utils/logger');

async function mergeAndFormat(currentCode, stepCode) {
  try {
    // Merge the code using our module
    const mergedCode = await mergeCode(currentCode, stepCode);
    
    // Format the merged code
    try {
      return prettier.format(mergedCode, {
        parser: 'babel',
        semi: true,
        singleQuote: false,
        trailingComma: 'es5',
      });
    } catch (formatError) {
      logger.error('Prettier formatting failed:', formatError);
      return mergedCode;
    }
  } catch (error) {
    logger.error('Error in merge:', error);
    throw error;
  }
}

async function BlockInserterAgent(sharedState, { logger, traceId }) {
  try {
    // Extract and validate required fields
    const { currentCode, stepCode } = sharedState;
    if (currentCode === undefined || currentCode === null) {
      throw new Error('BlockInserterAgent: currentCode is required in sharedState');
    }
    if (stepCode === undefined || stepCode === null) {
      throw new Error('BlockInserterAgent: stepCode is required in sharedState');
    }

    logger.info('BlockInserterAgent called', { traceId });
    
    // Merge and format the code
    const formattedCode = await mergeAndFormat(currentCode, stepCode);
    
    // Update sharedState
    sharedState.currentCode = formattedCode;
    
    // Initialize metadata if it doesn't exist
    if (!sharedState.metadata) {
      sharedState.metadata = {
        startTime: new Date(),
        lastUpdate: new Date()
      };
    } else {
      sharedState.metadata.lastUpdate = new Date();
    }
    
    logger.info('BlockInserterAgent output', { traceId, formattedCode });
    return formattedCode;
  } catch (error) {
    logger.error('Error in BlockInserterAgent:', error);
    throw error;
  }
}

// Add mergeAndFormat as a property of BlockInserterAgent
BlockInserterAgent.mergeAndFormat = mergeAndFormat;

module.exports = BlockInserterAgent; 