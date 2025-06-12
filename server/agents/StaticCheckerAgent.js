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
const BlockInserterAgent = require('./BlockInserterAgent');

async function StaticCheckerAgent(sharedState, { logger, traceId }) {
  const { currentCode, stepCode } = sharedState;
  
  logger.info('StaticCheckerAgent input:', { 
    traceId, 
    currentCode: currentCode || '(empty)', 
    stepCode: stepCode || '(empty)'
  });

  // Get simulated merged code using the same merge logic
  const codeToCheck = await BlockInserterAgent.mergeAndFormat(currentCode, stepCode);
  
  logger.info('StaticCheckerAgent merged code:', { 
    traceId, 
    codeToCheck: codeToCheck || '(empty)'
  });

  const eslint = new ESLint();
  const results = await eslint.lintText(codeToCheck);

  const errors = results[0].messages.map(message => ({
    line: message.line,
    column: message.column,
    message: message.message,
    ruleId: message.ruleId
  }));

  sharedState.errors = errors;

  logger.info('StaticCheckerAgent output', { traceId, errors });
  return errors;
}

module.exports = StaticCheckerAgent; 