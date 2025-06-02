/**
 * RuntimePlayabilityAgent
 * Input: { code: string }
 * Output: {
 *   canvasActive: boolean,
 *   inputResponsive: boolean,
 *   playerMoved: boolean,
 *   winConditionReachable: boolean,
 *   log?: any
 * }
 *
 * Runs the game code in a headless browser and checks playability.
 */
async function RuntimePlayabilityAgent({ code }, { logger, traceId }) {
  logger.info('RuntimePlayabilityAgent called', { traceId });
  try {
    // For the mock phase: if 'UNPLAYABLE' appears in code, return all false
    if (/UNPLAYABLE/.test(code)) {
      return {
        canvasActive: false,
        inputResponsive: false,
        playerMoved: false,
        winConditionReachable: false
      };
    }
    return {
      canvasActive: true,
      inputResponsive: true,
      playerMoved: true,
      winConditionReachable: true
    };
  } catch (err) {
    logger.error('RuntimePlayabilityAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = RuntimePlayabilityAgent; 