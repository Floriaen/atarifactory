const recast = require('recast');
const jscodeshift = require('jscodeshift');
const mergeCodeTransform = require('../transforms/mergeCodeTransform');
const logger = require('./logger');

function mergeCode(currentCode, stepCode) {
  try {
    logger.info('codeMerge input:', { 
      currentCode: currentCode || '(empty)', 
      stepCode: stepCode || '(empty)'
    });

    // Parse both code strings to ASTs using recast and the Babel parser
    const parser = require('recast/parsers/babel');
    const currentAST = recast.parse(currentCode, { parser });
    const stepAST = recast.parse(stepCode, { parser });

    logger.info('codeMerge ASTs parsed successfully');

    // Pass the ASTs to the transform
    const mergedCode = mergeCodeTransform(
      { source: currentCode },
      { jscodeshift },
      { stepCode, currentAST, stepAST }
    );

    logger.info('codeMerge output:', { 
      mergedCode: mergedCode || '(empty)'
    });

    return mergedCode;
  } catch (err) {
    logger.error('codeMerge parsing failed:', { 
      error: err.message,
      stack: err.stack
    });
    // If parsing fails, fallback to concatenating the code
    const fallbackCode = currentCode + '\n' + stepCode;
    logger.info('codeMerge fallback output:', { 
      fallbackCode: fallbackCode || '(empty)'
    });
    return fallbackCode;
  }
}

module.exports = { mergeCode }; 