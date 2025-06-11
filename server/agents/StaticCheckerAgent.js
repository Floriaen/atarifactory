/**
 * StaticCheckerAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - stepCode: string - The code block to check
 * Output: { errors: Array<{ line: number, message: string }> }
 *
 * Performs static analysis on the code to find potential issues.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const logger = require('../utils/logger');

async function StaticCheckerAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode, stepCode } = sharedState;
    if (!currentCode) {
      throw new Error('StaticCheckerAgent: currentCode is required in sharedState');
    }
    if (!stepCode) {
      throw new Error('StaticCheckerAgent: stepCode is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('StaticCheckerAgent: llmClient is required');
    }

    logger.info('StaticCheckerAgent called', { traceId });
    
    // Combine code for analysis
    const combinedCode = `${currentCode}\n${stepCode}`;
    
    // Get static analysis from LLM
    const errors = await llmClient.analyzeCode(combinedCode);
    
    // Update sharedState
    sharedState.staticAnalysis = errors;
    sharedState.metadata.lastUpdate = new Date();
    
    logger.info('StaticCheckerAgent output', { traceId, errorCount: errors.length });
    return errors;
  } catch (error) {
    logger.error('Error in StaticCheckerAgent:', error);
    throw error;
  }
}

module.exports = StaticCheckerAgent; 