const recast = require('recast');
const jscodeshift = require('jscodeshift');
const mergeCodeTransform = require('../transforms/mergeCodeTransform');

function mergeCode(currentCode, stepCode) {
  try {
    // Parse both code strings to ASTs using recast and the Babel parser
    const parser = require('recast/parsers/babel');
    const currentAST = recast.parse(currentCode, { parser });
    const stepAST = recast.parse(stepCode, { parser });
    // Pass the ASTs to the transform
    return mergeCodeTransform(
      { source: currentCode },
      { jscodeshift },
      { stepCode, currentAST, stepAST }
    );
  } catch (err) {
    // If parsing fails, fallback to concatenating the code
    return currentCode + '\n' + stepCode;
  }
}

module.exports = { mergeCode }; 