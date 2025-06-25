// Planning Pipeline: runs GameInventor, GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
import { createGameInventorChain } from '../chains/GameInventorChain.js';
import { createGameDesignChain } from '../chains/design/GameDesignChain.mjs';
import { createPlayabilityValidatorChain } from '../chains/PlayabilityValidatorChain.js';
import { createPlayabilityAutoFixChain } from '../chains/PlayabilityAutoFixChain.js';
import { createPlayabilityHeuristicChain } from '../chains/design/PlayabilityHeuristicChain.mjs';
import { createPlannerChain } from '../chains/PlannerChain.js';

import { ChatOpenAI } from '@langchain/openai';

async function runPlanningPipeline(sharedState, onStatusUpdate) {
  if (typeof sharedState.tokenCount !== 'number') {
    sharedState.tokenCount = 0;
  }
  // 1. Game Inventor
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'start', tokenCount: sharedState.tokenCount });
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1';
  const llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  // Use the same llm instance for all chains for single-LLM architecture
  const gameInventorChain = await createGameInventorChain(llm);
  const inventorOut = await gameInventorChain.invoke({});
  if (sharedState && typeof sharedState.tokenCount === 'number' && inventorOut) {
    // Dynamically import to avoid circular deps
    const { estimateTokens } = await import(new URL('../../utils/tokenUtils.js', import.meta.url));
    sharedState.tokenCount += estimateTokens(JSON.stringify(inventorOut));
  }
  if (typeof inventorOut !== 'object' || inventorOut === null) {
    console.error('GameInventorChain returned non-object:', inventorOut);
    throw new Error('GameInventorChain did not return a valid object. Output: ' + String(inventorOut));
  }
  sharedState.idea = inventorOut.idea || inventorOut.name || inventorOut.title || inventorOut;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameInventor', status: 'done', output: inventorOut, tokenCount: sharedState.tokenCount });

  // 2. Game Design
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameDesign', status: 'start', tokenCount: sharedState.tokenCount });
  const gameDesignChain = await createGameDesignChain({
    llm,
    sharedState
  });
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
  // TODO [refactor]: Accepts both 'name' and 'title' as valid game definition fields for now.
  // Standardize chain output to use a single canonical property (e.g., always 'title' or always 'name').
  } else if ((designOut.name || designOut.title) && designOut.mechanics && designOut.winCondition) {
    sharedState.gameDef = designOut;
  } else {
    throw new Error('GameDesignChain did not return a valid game definition. Output: ' + JSON.stringify(designOut));
  }
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'GameDesign', status: 'done', output: designOut, tokenCount: sharedState.tokenCount });

  // 3. Playability Validator
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityValidator', status: 'start', tokenCount: sharedState.tokenCount });
  const playabilityValidatorChain = await createPlayabilityValidatorChain(llm);
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: sharedState.gameDef.mechanics || [], winCondition: sharedState.gameDef.winCondition || '' });
  sharedState.isPlayable = validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityValidator', status: 'done', output: validatorOut, tokenCount: sharedState.tokenCount });

  // 4. Playability Heuristic
  let playability;
  const playabilityHeuristicChain = await createPlayabilityHeuristicChain(llm);
  playability = await playabilityHeuristicChain.invoke({ ...sharedState, gameDef: sharedState.gameDef });
  sharedState.playability = playability;
  if (typeof playability?.score === 'number') {
    sharedState.isPlayable = playability.score >= 5; // or your own threshold
  } else if (sharedState.gameDef && sharedState.gameDef.mechanics && sharedState.gameDef.winCondition) {
    sharedState.isPlayable = true; // fallback: if core fields exist, assume playable
  } else {
    sharedState.isPlayable = false;
  }
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityHeuristic', status: 'done', output: playability, tokenCount: sharedState.tokenCount });

  // 4. Playability AutoFix (if needed)
  console.debug('[DEBUG] sharedState before fixedGameDef assignment:', sharedState);
  let fixedGameDef = sharedState.gameDef;
  console.debug('[DEBUG] sharedState.gameDef after assignment:', sharedState.gameDef);
  console.debug('[DEBUG] fixedGameDef after assignment:', fixedGameDef);
  if (!sharedState.isPlayable) {
    if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'start', tokenCount: sharedState.tokenCount });
    const playabilityAutoFixChain = await createPlayabilityAutoFixChain(llm);
    const autofixResult = await playabilityAutoFixChain.invoke({
      ...sharedState,
      gameDef: fixedGameDef,
    });
    console.debug('[DEBUG] PlayabilityAutoFixChain result:', autofixResult);
    if (autofixResult && typeof autofixResult === 'object' && Object.keys(autofixResult).length > 0) {
      // Patch: increment token count for PlayabilityAutoFixChain output
      if (sharedState && typeof sharedState.tokenCount === 'number' && autofixResult) {
        const { estimateTokens } = await import(new URL('../../utils/tokenUtils.js', import.meta.url));
        sharedState.tokenCount += estimateTokens(JSON.stringify(autofixResult));
      }
      fixedGameDef = autofixResult;
      if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'done', output: fixedGameDef });
    } else {
      console.warn('[WARN] PlayabilityAutoFixChain returned invalid or empty result; keeping previous fixedGameDef.');
      if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'PlayabilityAutoFix', status: 'done', output: fixedGameDef });
    }
  }

  // 5. Planner
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'Planner', status: 'start', tokenCount: sharedState.tokenCount });
  console.debug('[DEBUG] fixedGameDef before planner error check:', fixedGameDef);
  if (
    typeof fixedGameDef === 'undefined' ||
    fixedGameDef === null ||
    typeof fixedGameDef !== 'object' ||
    Array.isArray(fixedGameDef)
  ) {
    throw new Error('No valid game definition object for planning step: ' + JSON.stringify(fixedGameDef));
  }
  const plannerChain = await createPlannerChain(llm);
  console.debug('[DIAG] fixedGameDef:', fixedGameDef);
  const planOut = await plannerChain.invoke({ gameDefinition: JSON.stringify(fixedGameDef, null, 2) });
  console.debug('[PlannerChain] output:', planOut);
  let planArr = null;
  if (Array.isArray(planOut)) {
    planArr = planOut;
  } else if (planOut && Array.isArray(planOut.plan)) {
    planArr = planOut.plan;
  }
  if (!planArr || planArr.length === 0) throw new Error('PlannerChain did not return a valid plan array. Output: ' + JSON.stringify(planOut));
  sharedState.plan = planArr;
  if (onStatusUpdate) onStatusUpdate('PlanningStep', { phase: 'Planner', status: 'done', output: planArr, tokenCount: sharedState.tokenCount });
  return sharedState;
}

export { runPlanningPipeline };