// Planning Pipeline: runs GameDesign, PlayabilityValidator, PlayabilityAutoFix, Planner
import { IDEA_GENERATOR_LLM_TEMPERATURE, GAME_THEMES, PLANNING_PHASE } from '../../config/pipeline.config.js';
import { createGameDesignChain, CHAIN_STATUS as GAME_DESIGN_STATUS } from '../chains/design/GameDesignChain.js';
import { createPlayabilityValidatorChain, CHAIN_STATUS as PLAYABILITY_VALIDATOR_STATUS } from '../chains/PlayabilityValidatorChain.js';
import { createPlayabilityAutoFixChain } from '../chains/PlayabilityAutoFixChain.js';
import { createPlayabilityHeuristicChain, CHAIN_STATUS as PLAYABILITY_HEURISTIC_STATUS } from '../chains/design/PlayabilityHeuristicChain.js';
import { createPlannerChain, CHAIN_STATUS as PLANNER_STATUS } from '../chains/PlannerChain.js';
import { ChatOpenAI } from '@langchain/openai';
import { createPipelineTracker } from '../../utils/PipelineTracker.js';
// Token estimation no longer needed - handled automatically by chains
import logger from '../../utils/logger.js';
import { validateContext } from '../../utils/designContext.js';

async function runPlanningPipeline(sharedState, onStatusUpdate) {
  const statusUpdate = onStatusUpdate || (() => { });
  // Token counting is handled automatically by individual chains

  // Skip planning if gameDef and plan are already populated (e.g., MINIMAL_GAME mode)
  if (sharedState.gameDef && sharedState.plan && Array.isArray(sharedState.plan) && sharedState.plan.length > 0) {
    logger.info('Planning pipeline skipped: gameDef and plan already populated', {
      gameDef: sharedState.gameDef,
      planLength: sharedState.plan.length
    });
    return;
  }

  // Create pipeline tracker with defined steps
  const tracker = createPipelineTracker('planning', 'Planning', 'Designing game', statusUpdate);
  
  // Define pipeline steps with proper weights
  tracker.addSteps([
    { ...GAME_DESIGN_STATUS, weight: 0.25 },
    { ...PLAYABILITY_VALIDATOR_STATUS, weight: 0.25 },
    { ...PLAYABILITY_HEURISTIC_STATUS, weight: 0.25 },
    { ...PLANNER_STATUS, weight: 0.25 }
  ]);

  const openaiModel = process.env.OPENAI_MODEL;
  if (!openaiModel) {
    throw new Error('OPENAI_MODEL environment variable must be set');
  }
  // Use centralized config for idea generator temperature
  const llmIdea = new ChatOpenAI({ model: openaiModel, temperature: IDEA_GENERATOR_LLM_TEMPERATURE });
  const llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });

  // 1. Game Design
  const designOut = await tracker.executeStep(async () => {
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
    const result = await gameDesignChain.invoke({ name: sharedState.idea, description: sharedState.idea, constraints });
    if (!result) throw new Error('GameDesignChain returned nothing');
    
    return result;
  }, GAME_DESIGN_STATUS, { sharedState, llm: llmIdea });

  if (designOut.gameDef) {
    sharedState.gameDef = designOut.gameDef;
    // TODO [refactor]: Accepts both 'name' and 'title' as valid game definition fields for now.
    // Standardize chain output to use a single canonical property (e.g., always 'title' or always 'name').
  } else if ((designOut.name || designOut.title) && designOut.mechanics && designOut.winCondition) {
    sharedState.gameDef = designOut;
  } else {
    throw new Error('GameDesignChain did not return a valid game definition. Output: ' + JSON.stringify(designOut));
  }

  // Normalize title/name at boundary (non-breaking): prefer 'title', fall back from 'name'
  if (sharedState.gameDef && !sharedState.gameDef.title && sharedState.gameDef.name) {
    sharedState.gameDef.title = sharedState.gameDef.name;
  }

  // 2. Playability Validator
  const validatorOut = await tracker.executeStep(async () => {
    const playabilityValidatorChain = await createPlayabilityValidatorChain(llm, { sharedState });
    const result = await playabilityValidatorChain.invoke({ 
      mechanics: sharedState.gameDef.mechanics || [], 
      winCondition: sharedState.gameDef.winCondition || '' 
    });
    return result;
  }, PLAYABILITY_VALIDATOR_STATUS, { sharedState, llm });

  // Map schema field 'winnable' to internal 'isPlayable' (non-breaking)
  sharedState.isPlayable = typeof validatorOut?.winnable === 'boolean'
    ? validatorOut.winnable
    : validatorOut.isPlayable;
  sharedState.suggestion = validatorOut.suggestion;

  // 3. Playability Heuristic
  const playability = await tracker.executeStep(async () => {
    const playabilityHeuristicChain = await createPlayabilityHeuristicChain(llm, { sharedState });
    const gd = sharedState.gameDef || {};
    const context = validateContext({
      version: 'v1',
      title: gd.title || gd.name,
      pitch: gd.description || gd.pitch,
      mechanics: gd.mechanics,
      winCondition: gd.winCondition,
      entities: gd.entities,
    });
    sharedState.context = context;
    const result = await playabilityHeuristicChain.invoke({ context });
    return result;
  }, PLAYABILITY_HEURISTIC_STATUS, { sharedState, llm });

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
    // Do NOT emit a progress event for AutoFix - this is optional/conditional

    const playabilityAutoFixChain = await createPlayabilityAutoFixChain(llm, { sharedState });
    const autofixResult = await playabilityAutoFixChain.invoke({
      ...sharedState,
      gameDef: fixedGameDef,
    });
    if (autofixResult && typeof autofixResult === 'object' && Object.keys(autofixResult).length > 0) {
      // Token counting is now handled automatically by the chain
      fixedGameDef = autofixResult;
      // Normalize title/name again after autofix
      if (fixedGameDef && !fixedGameDef.title && fixedGameDef.name) {
        fixedGameDef.title = fixedGameDef.name;
      }
    }
  }

  // 5. Planner
  const planOut = await tracker.executeStep(async () => {
    if (
      typeof fixedGameDef === 'undefined' ||
      fixedGameDef === null ||
      typeof fixedGameDef !== 'object' ||
      Array.isArray(fixedGameDef)
    ) {
      throw new Error('No valid game definition object for planning step: ' + JSON.stringify(fixedGameDef));
    }
    const plannerChain = await createPlannerChain(llm, { sharedState });
    const result = await plannerChain.invoke({ gameDefinition: JSON.stringify(fixedGameDef, null, 2) });
    return result;
  }, PLANNER_STATUS, { sharedState, llm });

  let planArr = null;
  if (Array.isArray(planOut)) {
    planArr = planOut;
  } else if (planOut && Array.isArray(planOut.plan)) {
    planArr = planOut.plan;
  }
  if (!planArr || planArr.length === 0) throw new Error('PlannerChain did not return a valid plan array. Output: ' + JSON.stringify(planOut));
  sharedState.plan = planArr;

  // Warn-only runtime sanity checks (non-breaking): ensure plan includes key implementation steps
  try {
    const hasGoal = !!sharedState.gameDef?.goal || !!sharedState.gameDef?.winCondition;
    const hasFail = !!sharedState.gameDef?.fail;
    const hasControls = !!sharedState.gameDef?.controls || (Array.isArray(sharedState.gameDef?.mechanics) && sharedState.gameDef.mechanics.length > 0);
    const planText = (sharedState.plan || []).map(s => String(s.description || '').toLowerCase()).join(' | ');
    if (hasControls && !(/control|input|map|arrowleft|arrowright|wasd/.test(planText))) {
      logger.warn('Planner plan may be missing controls mapping step');
    }
    if (hasGoal && !(/victory|win|goal|reach|collect|survive|check/.test(planText))) {
      logger.warn('Planner plan may be missing explicit victory check step');
    }
    if (hasFail && !(/fail|lose|collision|hit|timeout|game over/.test(planText))) {
      logger.warn('Planner plan may be missing explicit failure check step');
    }
  } catch (e) {
    logger.debug('Sanity checks failed silently', { error: e?.message });
  }

  return sharedState;
}

export { runPlanningPipeline };
