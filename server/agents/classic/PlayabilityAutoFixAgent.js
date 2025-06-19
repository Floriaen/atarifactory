// PlayabilityAutoFixAgent.js
// Receives a gameDef and an LLM suggestion string, applies the suggestion to the gameDef, and returns a fixed gameDef.
// For this scaffold, we only parse simple mechanic/entity/winCondition suggestions.

/**
 * Attempts to auto-apply an LLM suggestion to the game definition.
 * @param {object} validationResult - DesignValidationResult { gameDef, isPlayable, suggestion, ... }
 * @param {object} opts - { logger, traceId }
 * @returns {object} - DesignValidationResult with applied fix (adds: fixed, note)
 */
async function PlayabilityAutoFixAgent(validationResult, { logger, traceId, llmClient }) {
  const { gameDef, suggestion } = validationResult;
  if (!suggestion || !gameDef) {
    throw new Error('PlayabilityAutoFixAgent: Missing suggestion or gameDef');
  }
  if (!llmClient) {
    throw new Error('PlayabilityAutoFixAgent: llmClient is required');
  }

  // Load LLM prompt template from file and interpolate
  const fs = require('fs');
  const path = require('path');
  const promptPath = path.join(__dirname, 'prompts', 'PlayabilityAutoFixAgent.prompt.md');
  let promptTemplate = fs.readFileSync(promptPath, 'utf8');
  const prompt = promptTemplate
    .replace('{{gameDef}}', JSON.stringify(gameDef, null, 2))
    .replace('{{suggestion}}', suggestion);

  if (logger) logger.info('PlayabilityAutoFixAgent LLM prompt', { traceId, prompt });

  let llmResponse;
  try {
    llmResponse = await llmClient.chatCompletion({
      prompt,
      // Optionally, add other parameters like model, temperature, etc.
    });
  } catch (err) {
    if (logger) logger.error('PlayabilityAutoFixAgent LLM error', {
      traceId,
      error: err,
      stack: err && err.stack,
      message: err && err.message,
      stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
    });
    throw new Error('PlayabilityAutoFixAgent: LLM call failed');
  }

  if (logger) logger.info('PlayabilityAutoFixAgent LLM response', { traceId, llmResponse });
  if (!llmResponse || typeof llmResponse !== 'object') {
    throw new Error('PlayabilityAutoFixAgent: LLM did not return a valid gameDef object');
  }

  return {
    fixed: true,
    gameDef: llmResponse,
    note: 'Fixed using LLM suggestion',
  };
}


module.exports = PlayabilityAutoFixAgent;
