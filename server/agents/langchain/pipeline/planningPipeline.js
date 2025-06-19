// Planning Pipeline: runs GameInventor, GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
const { createGameInventorChain } = require('../chains/GameInventorChain');
const { createGameDesignChain } = require('../chains/GameDesignChain');
const { createPlayabilityValidatorChain } = require('../chains/PlayabilityValidatorChain');
const { createPlayabilityAutoFixChain } = require('../chains/PlayabilityAutoFixChain');
const { createPlannerChain } = require('../chains/PlannerChain');

async function runPlanningPipeline(sharedState, onStatusUpdate) {
  // 1. Game Inventor
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'start' });
  const gameInventorChain = await createGameInventorChain();
  const inventorOut = await gameInventorChain.invoke({ title: sharedState.title });
  sharedState.idea = inventorOut.idea;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'done', output: inventorOut });

  // 2. Game Design
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameDesign', status: 'start' });
  const gameDesignChain = await createGameDesignChain();
  const designOut = await gameDesignChain.invoke({ name: sharedState.idea, description: sharedState.idea });
  if (!designOut) throw new Error('GameDesignChain returned nothing');
  if (designOut.gameDef) {
    sharedState.gameDef = designOut.gameDef;
  } else if (designOut.name && designOut.mechanics && designOut.winCondition) {
    sharedState.gameDef = designOut;
  } else {
    throw new Error('GameDesignChain did not return a valid game definition. Output: ' + JSON.stringify(designOut));
  }
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameDesign', status: 'done', output: designOut });

  // 3. Playability Validator
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityValidator', status: 'start' });
  const playabilityValidatorChain = await createPlayabilityValidatorChain();
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: sharedState.gameDef.mechanics || [], winCondition: sharedState.gameDef.winCondition || '' });
  sharedState.isPlayable = validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityValidator', status: 'done', output: validatorOut });

  // 4. Playability AutoFix (if needed)
  let fixedGameDef = sharedState.gameDef;
  if (!sharedState.isPlayable) {
    if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'start' });
    const playabilityAutoFixChain = await createPlayabilityAutoFixChain();
    const autoFixOut = await playabilityAutoFixChain.invoke({ gameDef: sharedState.gameDef, suggestion: sharedState.suggestion });
    fixedGameDef = autoFixOut.gameDef;
    sharedState.fixed = autoFixOut.fixed;
    sharedState.fixedGameDef = fixedGameDef;
    if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'done', output: autoFixOut });
  }

  // 5. Planner
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'Planner', status: 'start' });
  const plannerChain = await createPlannerChain();
  const planOut = await plannerChain.invoke({ gameDefinition: fixedGameDef });
  let planArr = null;
  if (Array.isArray(planOut)) {
    planArr = planOut;
  } else if (planOut && Array.isArray(planOut.plan)) {
    planArr = planOut.plan;
  }
  if (!planArr || planArr.length === 0) throw new Error('PlannerChain did not return a valid plan array. Output: ' + JSON.stringify(planOut));
  sharedState.plan = planArr;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'Planner', status: 'done', output: planArr });
  return sharedState;
}

module.exports = { runPlanningPipeline };