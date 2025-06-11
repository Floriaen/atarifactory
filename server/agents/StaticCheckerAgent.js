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
    if (!currentCode && currentCode !== '') {
      throw new Error('StaticCheckerAgent: currentCode is required in sharedState');
    }
    if (!stepCode && stepCode !== '') {
      throw new Error('StaticCheckerAgent: stepCode is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('StaticCheckerAgent: llmClient is required');
    }

    logger.info('StaticCheckerAgent called', { traceId });
    
    // Combine current code and step code for analysis
    const combinedCode = `${currentCode}\n${stepCode}`.trim();
    
    // Get static analysis from LLM
    const analysis = await llmClient.chatCompletion({
      prompt: `Analyze this code for static errors:\n\n${combinedCode}`,
      outputType: 'json-array'
    });

    if (Array.isArray(analysis)) {
      sharedState.errors = analysis;
      sharedState.metadata.lastUpdate = new Date();
      logger.info('StaticCheckerAgent output', { traceId, errorCount: analysis.length });
      return analysis;
    }
    return analysis;
  } catch (error) {
    logger.error('Error in StaticCheckerAgent:', error);
    throw error;
  }
}

module.exports = StaticCheckerAgent; 