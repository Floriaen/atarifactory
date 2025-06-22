// StaticCheckerChain: wraps StaticCheckerAgent for pipeline compatibility (does not use LLM)

const { ESLint } = require('eslint');
const { cleanUp } = require('../../utils/cleanUp');
const pipelineConfig = require('../../config/pipeline.eslint.config');

async function run({ currentCode, stepCode, logger = console, traceId = 'test' }) {
  logger.info('StaticCheckerChain input:', {
    traceId,
    currentCode: currentCode || '(empty)',
    stepCode: stepCode || '(empty)'
  });

  // Use stepCode directly (merge logic removed)
  let codeToCheck;
  try {
    codeToCheck = cleanUp(stepCode);
  } catch (parseError) {
    logger.error('StaticCheckerChain: Parse error in cleanUp', {
      traceId,
      error: parseError.message,
      stack: parseError.stack
    });
    const syntaxError = {
      line: 1,
      column: 0,
      message: `Syntax error: ${parseError.message}`,
      ruleId: 'parse-error'
    };
    return {
      staticCheckPassed: false,
      errors: [syntaxError]
    };
  }

  logger.info('StaticCheckerChain merged+cleaned code:', {
    traceId,
    codeToCheck: codeToCheck || '(empty)'
  });

  try {
    const eslint = new ESLint({
      overrideConfig: pipelineConfig,
      useEslintrc: false
    });
    const results = await eslint.lintText(codeToCheck);
    if (!results || !Array.isArray(results) || results.length === 0) {
      logger.warn('StaticCheckerChain: No ESLint results returned', { traceId });
      return {
        staticCheckPassed: true,
        errors: []
      };
    }
    const errors = results[0].messages.map(message => ({
      line: message.line,
      column: message.column,
      message: message.message,
      ruleId: message.ruleId
    }));
    logger.info('StaticCheckerChain output', { traceId, errors });
    return {
      staticCheckPassed: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('StaticCheckerChain: ESLint error', {
      traceId,
      error: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    throw new Error(`Static validation failed: ${error.message}`);
  }
}

module.exports = { run };
