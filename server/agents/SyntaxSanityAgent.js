/**
 * SyntaxSanityAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * Output: { isValid: boolean, errors: Array<string> }
 *
 * Performs basic syntax validation on the code.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const logger = require('../utils/logger');

async function SyntaxSanityAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode } = sharedState;
    if (!currentCode) {
      throw new Error('SyntaxSanityAgent: currentCode is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('SyntaxSanityAgent: llmClient is required');
    }

    logger.info('SyntaxSanityAgent called', { traceId });
    
    // Get syntax validation from LLM
    const result = await llmClient.validateSyntax(currentCode);
    
    // Update sharedState
    sharedState.syntaxValidation = result;
    sharedState.metadata.lastUpdate = new Date();
    
    logger.info('SyntaxSanityAgent output', { traceId, isValid: result.isValid });
    return result;
  } catch (error) {
    logger.error('Error in SyntaxSanityAgent:', error);
    throw error;
  }
}

module.exports = SyntaxSanityAgent; 