/**
 * PlannerAgent
 * Input: SharedState
 * Required fields:
 * - gameDef: GameDefinition - The game definition from GameDesignAgent
 * Output: Array<{ id: number, label: string }>
 *
 * Generates an ordered array of build steps for the game.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const path = require('path');

async function PlannerAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { gameDef } = sharedState;
    if (!gameDef) {
      throw new Error('PlannerAgent: gameDef is required in sharedState');
    }

    // Validate gameDef structure
    if (!gameDef.title || typeof gameDef.title !== 'string') {
      throw new Error('PlannerAgent: gameDef.title is required and must be a string');
    }
    if (!gameDef.description || typeof gameDef.description !== 'string') {
      throw new Error('PlannerAgent: gameDef.description is required and must be a string');
    }
    if (!gameDef.mechanics || !Array.isArray(gameDef.mechanics)) {
      throw new Error('PlannerAgent: gameDef.mechanics is required and must be an array');
    }

    logger.info('PlannerAgent called', { traceId, gameDefinition: gameDef });

    // Load prompt from file
    const promptPath = path.join(__dirname, 'prompts', 'PlannerAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate.replace('{{gameDefinition}}', JSON.stringify(gameDef, null, 2));

    if (!llmClient) {
      logger.error('PlannerAgent: llmClient is required but was not provided', { traceId });
      throw new Error('PlannerAgent: llmClient is required but was not provided');
    }

    const plan = await llmClient.chatCompletion({ prompt, outputType: 'json-array' });
    logger.info('PlannerAgent output', { traceId, plan });

    // Validate plan array structure
    if (!Array.isArray(plan) || plan.length === 0) {
      throw new Error('PlannerAgent: LLM output missing or invalid plan array');
    }

    // Validate each step in the plan
    plan.forEach((step, index) => {
      if (!step || typeof step !== 'object') {
        throw new Error(`PlannerAgent: Invalid step at index ${index} - must be an object`);
      }
      if (typeof step.id !== 'number' || step.id <= 0) {
        throw new Error(`PlannerAgent: Invalid step.id at index ${index} - must be a positive number`);
      }
      if (typeof step.label !== 'string' || step.label.trim() === '') {
        throw new Error(`PlannerAgent: Invalid step.label at index ${index} - must be a non-empty string`);
      }
    });

    // Ensure step IDs are sequential
    const stepIds = plan.map(step => step.id).sort((a, b) => a - b);
    if (!stepIds.every((id, index) => id === index + 1)) {
      throw new Error('PlannerAgent: Step IDs must be sequential starting from 1');
    }

    sharedState.plan = plan;
    sharedState.metadata.lastUpdate = new Date();
    return plan;
  } catch (err) {
    logger.error('PlannerAgent error', { traceId, error: err });
    throw err;
  }
}

module.exports = PlannerAgent; 