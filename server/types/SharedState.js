/**
 * @typedef {Object} GameDefinition
 * @property {string} title - The title of the game
 * @property {string} description - The description of the game
 * @property {Object} rules - The game rules
 */

/**
 * @typedef {Object} Step
 * @property {string} id - Unique identifier for the step
 * @property {string} description - Description of what the step does
 * @property {string} type - Type of the step (e.g., 'code', 'test', 'feedback')
 */

/**
 * @typedef {Object} Error
 * @property {string} message - Error message
 * @property {string} type - Type of error
 * @property {string} [location] - Optional location of the error
 */

/**
 * @typedef {Object} RuntimeResults
 * @property {number} [playabilityScore] - Score indicating how playable the game is
 * @property {string} [feedback] - Feedback about the game
 */

/**
 * @typedef {Object} Metadata
 * @property {Date} startTime - When the pipeline started
 * @property {Date} lastUpdate - Last state update
 */

/**
 * @typedef {Object} SharedState
 * @property {GameDefinition|null} gameDef - The game definition from GameDesignAgent
 * @property {Step[]} plan - The full list of steps
 * @property {Step|null} currentStep - The step being processed
 * @property {string} currentCode - The code generated so far
 * @property {Error[]} errors - Array of current errors
 * @property {RuntimeResults} [runtimeResults] - Results from runtime execution
 * @property {Metadata} [metadata] - Additional metadata
 */

/**
 * Creates a new SharedState object with default values
 * @returns {SharedState}
 */
function createSharedState() {
  return {
    gameDef: null,
    plan: [],
    currentStep: null,
    currentCode: '',
    errors: [],
    runtimeResults: {},
    metadata: {
      startTime: new Date(),
      lastUpdate: new Date()
    }
  };
}

module.exports = {
  createSharedState
}; 