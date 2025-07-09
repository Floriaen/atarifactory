// Planning Pipeline: runs GameInventor, GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
import { IDEA_GENERATOR_LLM_TEMPERATURE, GAME_THEMES, PLANNING_PHASE } from '../../config/pipeline.config.mjs';
import { createGameInventorChain } from '../chains/GameInventorChain.js';
import { createGameDesignChain } from '../chains/design/GameDesignChain.mjs';
import { createPlayabilityValidatorChain } from '../chains/PlayabilityValidatorChain.js';
import { createPlayabilityAutoFixChain } from '../chains/PlayabilityAutoFixChain.js';
import { createPlayabilityHeuristicChain } from '../chains/design/PlayabilityHeuristicChain.mjs';
import { createPlannerChain } from '../chains/PlannerChain.js';
import { ChatOpenAI } from '@langchain/openai';
import { getClampedLocalProgress } from '../../utils/progress/weightedProgress.js';
import { estimateTokens } from '../../utils/tokenUtils.js';

async function runPlanningPipeline(sharedState, onStatusUpdate) {
  const statusUpdate = onStatusUpdate || (() => { });
  let tokenCount = typeof sharedState.tokenCount === 'number' ? sharedState.tokenCount : 0;
  sharedState.tokenCount = tokenCount;
  // --- Pipeline Progress Bar: Progress Event Emission ---
  // Only emit progress for main pipeline steps, not AutoFix
  let localStep = 1;
  const localTotal = 5;

  // 1. Game Inventor
  {
    const localProgress = getClampedLocalProgress(localStep, localTotal);
    statusUpdate('Progress', { progress: localProgress, phase: PLANNING_PHASE, tokenCount: sharedState.tokenCount });
  }

  const openaiModel = process.env.OPENAI_MODEL;
  if (!openaiModel) {
    throw new Error('OPENAI_MODEL environment variable must be set');
  }
  // Use centralized config for idea generator temperature
  const llmIdea = new ChatOpenAI({ model: openaiModel, temperature: IDEA_GENERATOR_LLM_TEMPERATURE });
  const llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  // Use the higher-temp LLM for idea generation
  const gameInventorChain = await createGameInventorChain(llmIdea);
  const inventorOut = await gameInventorChain.invoke({});
  if (sharedState && typeof sharedState.tokenCount === 'number' && inventorOut) {
    // Estimate tokens for inventor output
    sharedState.tokenCount += estimateTokens(JSON.stringify(inventorOut));
  }
  if (typeof inventorOut !== 'object' || inventorOut === null) {
    console.error('GameInventorChain returned non-object:', inventorOut);
    throw new Error('GameInventorChain did not return a valid object. Output: ' + String(inventorOut));
  }
  sharedState.idea = inventorOut.idea || inventorOut.name || inventorOut.title || inventorOut;

  // 2. Game Design
  localStep++;
  {
    const localProgress = getClampedLocalProgress(localStep, localTotal);
    statusUpdate('Progress', { progress: localProgress, phase: PLANNING_PHASE, tokenCount: sharedState.tokenCount });
  }

  // Generate a random constraint/theme for variety
  const randomTheme = GAME_THEMES[Math.floor(Math.random() * GAME_THEMES.length)];

  const gameDesignChain = await createGameDesignChain({
    llm: llmIdea,
    sharedState
  });
  // Ensure 'constraints' is always present for downstream chains
  let constraints = randomTheme;
  if (typeof sharedState.idea === 'object' && sharedState.idea.constraints) {
    constraints += ' ' + sharedState.idea.constraints;
  } else if (typeof sharedState.idea === 'string') {
    constraints += ' ' + sharedState.idea;
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

  // 3. Playability Validator
  localStep++;
  {
    const localProgress = getClampedLocalProgress(localStep, localTotal);
    statusUpdate('Progress', { progress: localProgress, phase: PLANNING_PHASE, tokenCount: sharedState.tokenCount });
  }

  const playabilityValidatorChain = await createPlayabilityValidatorChain(llm);
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: sharedState.gameDef.mechanics || [], winCondition: sharedState.gameDef.winCondition || '' });
  sharedState.isPlayable = validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;

  // 4. Playability Heuristic
  localStep++;
  {
    const localProgress = getClampedLocalProgress(localStep, localTotal);
    statusUpdate('Progress', { progress: localProgress, phase: PLANNING_PHASE, tokenCount: sharedState.tokenCount });
  }
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

  // 4. Playability AutoFix (if needed)
  let fixedGameDef = sharedState.gameDef;
  if (!sharedState.isPlayable) {
    // Do NOT emit a progress event for AutoFix

    const playabilityAutoFixChain = await createPlayabilityAutoFixChain(llm);
    const autofixResult = await playabilityAutoFixChain.invoke({
      ...sharedState,
      gameDef: fixedGameDef,
    });
    if (autofixResult && typeof autofixResult === 'object' && Object.keys(autofixResult).length > 0) {
      // Patch: increment token count for PlayabilityAutoFixChain output
      if (sharedState && typeof sharedState.tokenCount === 'number' && autofixResult) {
        sharedState.tokenCount += estimateTokens(JSON.stringify(autofixResult));
      }
      fixedGameDef = autofixResult;
    }
  }

  // 5. Planner
  localStep++;
  {
    const localProgress = getClampedLocalProgress(localStep, localTotal);
    statusUpdate('Progress', { progress: localProgress, phase: PLANNING_PHASE, tokenCount: sharedState.tokenCount });
  }

  if (
    typeof fixedGameDef === 'undefined' ||
    fixedGameDef === null ||
    typeof fixedGameDef !== 'object' ||
    Array.isArray(fixedGameDef)
  ) {
    throw new Error('No valid game definition object for planning step: ' + JSON.stringify(fixedGameDef));
  }
  const plannerChain = await createPlannerChain(llm);
  const planOut = await plannerChain.invoke({ gameDefinition: JSON.stringify(fixedGameDef, null, 2) });

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

export { runPlanningPipeline };