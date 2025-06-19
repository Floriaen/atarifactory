// StaticCheckerChain: wraps StaticCheckerAgent for pipeline compatibility (does not use LLM)

const StaticCheckerAgent = require('../StaticCheckerAgent');

async function run({ currentCode, stepCode, logger = console, traceId = 'test' }) {
  // Wrap input in sharedState object for StaticCheckerAgent
  const sharedState = { currentCode, stepCode };
  const result = await StaticCheckerAgent(sharedState, { logger, traceId });
  return {
    staticCheckPassed: !result.errors || result.errors.length === 0,
    errors: result.errors || []
  };
}

module.exports = { run };
