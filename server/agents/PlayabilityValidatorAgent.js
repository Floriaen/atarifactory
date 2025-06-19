// PlayabilityValidatorAgent.js
// Checks if the declared mechanics are sufficient to achieve the winCondition.
// If not, throws an error or (optionally) returns a simplified fallback design.

/**
 * PlayabilityValidatorAgent
 * @param {object} sharedState - The shared pipeline state (expects gameDef)
 * @param {object} opts - { logger, traceId }
 * @returns {object} - The validated (or simplified) gameDef
 * @throws if the game is unwinnable by logic
 */
/**
 * PlayabilityValidatorAgent
 * @param {object} sharedState - The shared pipeline state (expects gameDef)
 * @param {object} opts - { logger, traceId, llmClient }
 * @returns {object} - The validated (or simplified) gameDef
 * @throws if the game is unwinnable by logic
 */
module.exports = async function PlayabilityValidatorAgent(sharedState, { logger, traceId, llmClient }) {
  const { gameDef } = sharedState;
  if (!gameDef || !gameDef.mechanics || !gameDef.winCondition) {
    throw new Error('PlayabilityValidatorAgent: Missing gameDef, mechanics, or winCondition');
  }

  // Simple rule-based check: look for verbs in mechanics that match winCondition
  const mechanics = gameDef.mechanics.map(m => m.toLowerCase());
  const win = gameDef.winCondition.toLowerCase();

  // Common win verbs and required mechanics
  const WIN_VERB_TO_MECHANIC = [
    { verb: 'collect', required: ['collect', 'pick', 'grab'] },
    { verb: 'reach', required: ['move', 'reach', 'go', 'walk', 'jump'] },
    { verb: 'defeat', required: ['attack', 'shoot', 'defeat', 'destroy'] },
    { verb: 'avoid', required: ['move', 'avoid', 'dodge'] },
    { verb: 'score', required: ['score', 'collect', 'hit'] },
    { verb: 'light', required: ['light', 'ignite', 'activate'] },
    { verb: 'escape', required: ['move', 'escape'] },
    { verb: 'survive', required: ['move', 'avoid', 'survive'] },
  ];

  let playable = false;
  let ambiguous = false;
  for (const mapping of WIN_VERB_TO_MECHANIC) {
    if (win.includes(mapping.verb)) {
      // At least one required mechanic must be present
      if (mechanics.some(m => mapping.required.some(req => m.includes(req)))) {
        playable = true;
        break;
      } else {
        ambiguous = true; // Verb is present, but mechanic is missing
      }
    }
  }

  // Fallback: if winCondition is generic (e.g., 'win', 'finish'), allow any movement or collect mechanic
  if (!playable && (win.includes('win') || win.includes('finish'))) {
    if (mechanics.some(m => ['move', 'collect', 'reach'].some(req => m.includes(req)))) {
      playable = true;
    }
  }

  // If not playable and ambiguous, try LLM fallback
  let suggestion = undefined;
  let reason = undefined;
  if (!playable && ambiguous && llmClient) {
    if (logger) logger.info('PlayabilityValidatorAgent: Ambiguous playability, calling LLM for validation', { traceId, gameDef });
    // Read prompt template from file
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, 'prompts/PlayabilityValidatorAgent.prompt.md');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{mechanics}}', JSON.stringify(gameDef.mechanics))
      .replace('{{winCondition}}', JSON.stringify(gameDef.winCondition));
    let llmResult;
    try {
      llmResult = await llmClient.chatCompletion({
        prompt,
        outputType: 'json-object',
      });
    } catch (err) {
      logger && logger.error && logger.error('PlayabilityValidatorAgent: LLM fallback failed', { traceId, error: err });
      throw new Error('PlayabilityValidatorAgent: LLM fallback failed');
    }
    if (llmResult && llmResult.winnable === true) {
      playable = true;
    } else {
      suggestion = llmResult && llmResult.suggestion;
      reason = 'LLM fallback: Mechanics do not allow player to achieve winCondition';
    }
  }

  if (!playable) {
    // Always provide a suggestion if missing
    if (!suggestion || typeof suggestion !== 'string' || suggestion.trim().length === 0) {
      // Heuristic: suggest adding a mechanic that matches the win verb if possible
      let genericSuggestion = 'Try adding a mechanic that enables the win condition.';
      for (const mapping of WIN_VERB_TO_MECHANIC) {
        if (win.includes(mapping.verb)) {
          genericSuggestion = `Add one of the following mechanics: ${mapping.required.join(', ')}.`;
          break;
        }
      }
      suggestion = genericSuggestion;
    }
    logger && logger.warn && logger.warn('PlayabilityValidatorAgent: Unwinnable design detected', { traceId, gameDef, suggestion, reason });
    return { gameDef, isPlayable: false, suggestion, reason };
  }

  return { gameDef, isPlayable: true };

  return gameDef;
};
