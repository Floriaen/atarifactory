import { ESLint } from 'eslint';
import pipelineConfig from '../../config/staticchecker.eslint.config.js';

async function run({ currentCode, stepCode, logger = console, traceId = 'test' }) {
  logger.info('StaticCheckerChain input:', {
    traceId,
    currentCode: currentCode || '(empty)',
    stepCode: stepCode || '(empty)'
  });

  try {
    const eslint = new ESLint({
      overrideConfig: pipelineConfig
    });
    const results = await eslint.lintText(stepCode);
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

export { run };
