// Planning Pipeline: runs GameInventor, GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
const { createGameInventorChain } = require('../chains/GameInventorChain');
const { createGameDesignChain } = require('../chains/GameDesignChain');
const { createPlayabilityValidatorChain } = require('../chains/PlayabilityValidatorChain');
const { createPlayabilityAutoFixChain } = require('../chains/PlayabilityAutoFixChain');
const { createPlannerChain } = require('../chains/PlannerChain');

async function runPlanningPipeline(sharedState) {
  // 1. Game Inventor
  const gameInventorChain = await createGameInventorChain();
  const inventorOut = await gameInventorChain.invoke({ title: sharedState.title });
  sharedState.idea = inventorOut.idea;

  // 2. Game Design
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

  // 3. Playability Validator
  const playabilityValidatorChain = await createPlayabilityValidatorChain();
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: sharedState.gameDef.mechanics || [], winCondition: sharedState.gameDef.winCondition || '' });
  sharedState.isPlayable = validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;

  // 4. Playability AutoFix (if needed)
  let fixedGameDef = sharedState.gameDef;
  if (!sharedState.isPlayable) {
    const playabilityAutoFixChain = await createPlayabilityAutoFixChain();
    const autoFixOut = await playabilityAutoFixChain.invoke({ gameDef: sharedState.gameDef, suggestion: sharedState.suggestion });
    fixedGameDef = autoFixOut.gameDef;
    sharedState.fixed = autoFixOut.fixed;
    sharedState.fixedGameDef = fixedGameDef;
  }

  // 5. Planner
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
  return sharedState;
}

module.exports = { runPlanningPipeline };
