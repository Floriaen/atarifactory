// Planning Pipeline: runs GameInventor, GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
import { createGameInventorChain } from '../chains/GameInventorChain.js';
import { createGameDesignChain } from '../chains/design/GameDesignChain.mjs';
import { createPlayabilityValidatorChain } from '../chains/PlayabilityValidatorChain.js';
import { createPlayabilityAutoFixChain } from '../chains/PlayabilityAutoFixChain.js';
import { createPlannerChain } from '../chains/PlannerChain.js';

import { ChatOpenAI } from '@langchain/openai';

async function runPlanningPipeline(sharedState, onStatusUpdate) {
  // 1. Game Inventor
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'start' });
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1';
  const ideaLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  const designLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  const playabilityValidatorLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  const playabilityAutoFixLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  const plannerLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });

  const gameInventorChain = await createGameInventorChain(ideaLLM);
  const inventorOut = await gameInventorChain.invoke({});
  if (typeof inventorOut !== 'object' || inventorOut === null) {
    console.error('GameInventorChain returned non-object:', inventorOut);
    throw new Error('GameInventorChain did not return a valid object. Output: ' + String(inventorOut));
  }
  sharedState.idea = inventorOut.idea || inventorOut.name || inventorOut.title || inventorOut;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'done', output: inventorOut });

  // 2. Game Design
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameDesign', status: 'start' });
  const gameDesignChain = await createGameDesignChain(designLLM);
  // Ensure 'constraints' is always present for downstream chains
  let constraints = '';
  if (typeof sharedState.idea === 'object' && sharedState.idea.constraints) {
    constraints = sharedState.idea.constraints;
  } else if (typeof sharedState.idea === 'string') {
    constraints = sharedState.idea;
  }
  const designOut = await gameDesignChain.invoke({ name: sharedState.idea, description: sharedState.idea, constraints });
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
  const playabilityValidatorChain = await createPlayabilityValidatorChain(playabilityValidatorLLM);
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: sharedState.gameDef.mechanics || [], winCondition: sharedState.gameDef.winCondition || '' });
  sharedState.isPlayable = validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityValidator', status: 'done', output: validatorOut });

  // 4. Playability AutoFix (if needed)
  let fixedGameDef = sharedState.gameDef;
  if (!sharedState.isPlayable) {
    if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'start' });
    const playabilityAutoFixChain = await createPlayabilityAutoFixChain(playabilityAutoFixLLM);
    const autoFixOut = await playabilityAutoFixChain.invoke({ gameDef: sharedState.gameDef, suggestion: sharedState.suggestion });
    fixedGameDef = autoFixOut.gameDef;
    sharedState.fixed = autoFixOut.fixed;
    sharedState.fixedGameDef = fixedGameDef;
    if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'done', output: autoFixOut });
  }

  // 5. Planner
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'Planner', status: 'start' });
  const plannerChain = await createPlannerChain(plannerLLM);
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

export { runPlanningPipeline };