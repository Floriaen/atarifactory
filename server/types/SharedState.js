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

// SharedState schema and factory using Zod for strict consistency
import { z } from 'zod';

const MetadataSchema = z.object({
  startTime: z.date(),
  lastUpdate: z.date()
});

const SharedStateSchema = z.object({
  name: z.string(),
  description: z.string(),
  gameDef: z.any().nullable(),
  plan: z.array(z.any()),
  currentStep: z.any().nullable(),
  currentCode: z.string(),
  errors: z.array(z.any()),
  runtimeResults: z.any(),
  metadata: MetadataSchema,
  gameSource: z.string(),
  syntaxResult: z.any().nullable(),
  feedback: z.any().nullable(),
  tokenCount: z.number(),
  // New aggregated token counters (provider-reported)
  promptTokens: z.number().optional().default(0),
  completionTokens: z.number().optional().default(0),
  // Optional per-model breakdown
  modelTotals: z.record(z.object({
    prompt: z.number().optional().default(0),
    completion: z.number().optional().default(0),
    total: z.number().optional().default(0)
  })).optional().default({})
});

/**
 * Creates a new SharedState object with default values, validated by Zod.
 * @returns {SharedState}
 */
function createSharedState(init = {}) {
  return SharedStateSchema.parse({
    name: '',
    description: '',
    gameDef: null,
    plan: [],
    currentStep: null,
    currentCode: '',
    errors: [],
    runtimeResults: {},
    metadata: {
      startTime: new Date(),
      lastUpdate: new Date()
    },
    gameSource: '',
    syntaxResult: null,
    feedback: null,
    tokenCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    modelTotals: {},
    ...init
  });
}

/**
 * Validates and parses an updated SharedState object, ensuring no extra fields.
 * @param {object} update
 * @returns {SharedState}
 */
function parseSharedState(update) {
  return SharedStateSchema.parse(update);
}

export {
  SharedStateSchema,
  createSharedState,
  parseSharedState
};
