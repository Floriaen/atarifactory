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
const { ESLint } = require('eslint');
const { mergeCode } = require('../utils/codeMerge');
const pipelineConfig = require('../config/pipeline.eslint.config');

async function StaticCheckerAgent(sharedState, { logger, traceId }) {
  const { currentCode, stepCode } = sharedState;
  
  logger.info('StaticCheckerAgent input:', { 
    traceId, 
    currentCode: currentCode || '(empty)', 
    stepCode: stepCode || '(empty)'
  });

  // Get simulated merged code using the same merge logic (dry-run)
  const codeToCheck = mergeCode(currentCode, stepCode);
  
  logger.info('StaticCheckerAgent merged code:', { 
    traceId, 
    codeToCheck: codeToCheck || '(empty)'
  });

  try {
    // Use pipeline-specific ESLint config
    const eslint = new ESLint({
      overrideConfig: pipelineConfig,
      useEslintrc: false // Disable loading of .eslintrc files
    });

    const results = await eslint.lintText(codeToCheck);
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      logger.warn('StaticCheckerAgent: No ESLint results returned', { traceId });
      sharedState.errors = [];
      return [];
    }

    const errors = results[0].messages.map(message => ({
      line: message.line,
      column: message.column,
      message: message.message,
      ruleId: message.ruleId
    }));

    sharedState.errors = errors;
    logger.info('StaticCheckerAgent output', { traceId, errors });
    return errors;
  } catch (error) {
    logger.error('StaticCheckerAgent: ESLint error', { 
      traceId, 
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Static validation failed: ${error.message}`);
  }
}

module.exports = StaticCheckerAgent; 