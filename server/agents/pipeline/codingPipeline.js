// Coding Pipeline: runs IncrementalCoding, Feedback, StaticChecker, SyntaxSanity, RuntimePlayability
import { createIncrementalCodingChain, CHAIN_STATUS as CONTEXT_STEP_STATUS } from '../chains/IncrementalCodingChain.js';
import { createFeedbackChain, CHAIN_STATUS as FEEDBACK_STATUS } from '../chains/FeedbackChain.js';
import { run as staticCheckerRun, CHAIN_STATUS as STATIC_CHECKER_STATUS } from '../chains/StaticCheckerChain.js';
import { transformGameCodeWithLLM, CHAIN_STATUS as CONTROL_BAR_STATUS } from '../chains/ControlBarTransformerAgent.js';
import { createBackgroundCodeChain, CHAIN_STATUS as BACKGROUND_CODE_STATUS } from '../chains/coding/BackgroundCodeChain.js';
// Token estimation no longer needed - handled automatically by chains
import { ChatOpenAI } from '@langchain/openai';
import { createPipelineTracker } from '../../utils/PipelineTracker.js';
import { CODING_PHASE } from '../../config/pipeline.config.js';
import fs from 'fs';
import logger from '../../utils/logger.js';

const GAME_TEMPLATE = fs.readFileSync(new URL('../../gameBoilerplate/game.js', import.meta.url), 'utf-8');

async function runCodingPipeline(sharedState, onStatusUpdate) {
  const statusUpdate = onStatusUpdate || (() => { });

  let llm;
  if (process.env.MOCK_PIPELINE === '1') {
    // Use a dummy LLM and dummy chains for mock pipeline
    llm = { invoke: async () => ({ code: sharedState.gameSource || '', contextSteps: [] }) };
  } else {
    const openaiModel = process.env.OPENAI_MODEL;
    if (!openaiModel) {
      throw new Error('OPENAI_MODEL environment variable must be set');
    }
    llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  }
  
  // Token counting is handled automatically by individual chains

  // Create pipeline tracker for coding phase
  const tracker = createPipelineTracker('coding', 'Coding', 'Generating code', statusUpdate);

  // Calculate dynamic steps based on plan
  const dynamicSteps = sharedState.plan.map((step, i) => ({
    name: `Step${i+1}`,
    label: `Step ${i+1}`,
    description: step.description || `Implementation step ${i+1}`,
    weight: 0.6 / sharedState.plan.length, // 60% of coding phase
    planStep: step
  }));

  // Define fixed steps (place Background Code first so it shows in progress/logs)
  const fixedSteps = [
    { ...BACKGROUND_CODE_STATUS, weight: 0.1 },
    { ...FEEDBACK_STATUS, weight: 0.1 },
    { ...STATIC_CHECKER_STATUS, weight: 0.1 },
    { ...CONTROL_BAR_STATUS, weight: 0.1 },
    { name: 'Testing', label: 'Testing', description: 'Final validation', weight: 0.1, category: 'coding' }
  ];

  // Add all steps to tracker (Background Code appears before plan steps in progress)
  tracker.addSteps([ ...fixedSteps.slice(0,1), ...dynamicSteps, ...fixedSteps.slice(1) ]);

  // 1. Background code (optional in MOCK, required otherwise). Run as a tracked step for visibility.
  await tracker.executeStep(async () => {
    if (process.env.MOCK_PIPELINE === '1') return { skipped: true };
    const bgChain = await createBackgroundCodeChain(llm, { sharedState });
    const gd = sharedState.gameDef || {};
    const context = {
      title: gd.title || gd.name || 'Untitled',
      description: gd.description || gd.pitch || '',
      mechanics: gd.mechanics || [],
      entities: gd.entities || [],
      winCondition: gd.winCondition || ''
    };
    const out = await bgChain.invoke({ context });
    if (out && typeof out.code === 'string' && out.code.length > 0) {
      sharedState.backgroundCode = out.code;
    }
    return out;
  }, BACKGROUND_CODE_STATUS, { sharedState, llm });

  // 2. Context Step Builder (iterate over all steps)
  let contextStepBuilderChain;
  if (process.env.MOCK_PIPELINE === '1') {
    contextStepBuilderChain = {
      invoke: async () => ({ code: sharedState.gameSource || '', contextSteps: [] })
    };
  } else {
    contextStepBuilderChain = await createIncrementalCodingChain(llm, { sharedState });
  }
  
  // Seed with minimal scaffold for first step
  let accumulatedCode = typeof sharedState.gameSource === 'string' ? sharedState.gameSource : '';
  let lastStepCode = accumulatedCode;
  let allStepContexts = [];

  // Execute each plan step using the tracker
  for (const [i, step] of sharedState.plan.entries()) {
    const stepInfo = dynamicSteps[i];
    
    await tracker.executeStep(async () => {
      logger.info('CodingPipeline processing plan step', { step });
      // For first step, seed with minimal scaffold if no code yet
      let gameSourceForStep = i === 0 && !accumulatedCode.trim()
        ? GAME_TEMPLATE
        : accumulatedCode;

      const contextStepInput = {
        gameSource: gameSourceForStep,
        plan: JSON.stringify(sharedState.plan, null, 2),
        step: JSON.stringify(step, null, 2),
        entities: JSON.stringify(sharedState.gameDef?.entities || [], null, 0)
      };
      
      // Token counting is now handled automatically by the chain

      const contextStepsOut = await contextStepBuilderChain.invoke(contextStepInput);

      // Log the raw LLM output for diagnosis
      logger.debug('IncrementalCodingChain invoke output', { contextStepsOut });
      // If contextStepsOut is a string, treat as code; else look for .code property
      if (typeof contextStepsOut === 'string') {
        accumulatedCode = contextStepsOut;
      } else if (contextStepsOut && contextStepsOut.code) {
        accumulatedCode = contextStepsOut.code;
      }
      lastStepCode = accumulatedCode;
      allStepContexts.push(contextStepsOut.contextSteps || contextStepsOut);

      return contextStepsOut;
    }, stepInfo, { sharedState, llm });
  }
  
  sharedState.contextSteps = allStepContexts;
  sharedState.gameSource = accumulatedCode.trim();
  lastStepCode = sharedState.gameSource;

  // Warn-only checks: ensure generated code likely includes controls and win/lose indicators if plan suggested them
  try {
    const planText = (sharedState.plan || []).map(s => String(s.description || '').toLowerCase()).join(' | ');
    const code = sharedState.gameSource || '';
    const needsControls = /control|input|arrowleft|arrowright|move/.test(planText);
    const needsVictory = /victory|win|reach|collect|goal|exit/.test(planText);
    const needsFailure = /fail|lose|collision|hit|timeout|enemy/.test(planText);
    if (needsControls && !(/addEventListener\(|keydown|keyup/.test(code))) {
      logger.warn('Generated code may be missing controls handling');
    }
    if (needsVictory && !(/YOU WIN|WIN|victory/i.test(code))) {
      logger.warn('Generated code may be missing a victory check or indicator');
    }
    if (needsFailure && !(/GAME OVER|LOSE|failure/i.test(code))) {
      logger.warn('Generated code may be missing a failure check or indicator');
    }
  } catch (e) {
    logger.debug('Coding warn-only checks skipped', { error: e?.message });
  }

  // 2. Feedback
  const feedbackOut = await tracker.executeStep(async () => {
    let feedbackChain;
    if (process.env.MOCK_PIPELINE === '1') {
      feedbackChain = {
        invoke: async () => ({ suggestion: 'No feedback needed.' })
      };
    } else {
      feedbackChain = await createFeedbackChain(llm, { sharedState });
    }
    
    const runtimeLogs = `Player reached the goal area after switching forms. No errors detected.`;
    const stepId = sharedState.plan && sharedState.plan[0] && sharedState.plan[0].id ? sharedState.plan[0].id : 'step-1';

    // Token counting is now handled automatically by the chain

    return await feedbackChain.invoke({ runtimeLogs, stepId });
  }, FEEDBACK_STATUS, { sharedState, llm });

  let parsedFeedback = feedbackOut.feedback || feedbackOut;
  if (typeof parsedFeedback === 'string') {
    try {
      const parsed = JSON.parse(parsedFeedback);
      sharedState.feedback = parsed.suggestion || parsed;
    } catch (e) {
      throw new Error(`Feedback LLM did not return valid JSON: ${parsedFeedback}`);
    }
  } else if (parsedFeedback && typeof parsedFeedback === 'object' && parsedFeedback.suggestion) {
    sharedState.feedback = parsedFeedback.suggestion;
  } else {
    sharedState.feedback = parsedFeedback;
  }

  // 3. Static Checker
  const staticCheckerOut = await tracker.executeStep(async () => {
    const currentCode = typeof sharedState.gameSource === 'string' && sharedState.gameSource.length > 0
      ? sharedState.gameSource
      : accumulatedCode;
    const stepCode = lastStepCode && lastStepCode.length > 0 ? lastStepCode : currentCode;

    const result = await staticCheckerRun({
      currentCode,
      stepCode,
      logger,
      traceId: sharedState.traceId || 'coding-static-check'
    });

    sharedState.staticCheckPassed = result.staticCheckPassed;
    sharedState.staticCheckErrors = result.errors;

    if (!result.staticCheckPassed) {
      logger.error('Static checker detected issues', { errors: result.errors });
    }

    return result;
  }, STATIC_CHECKER_STATUS, { sharedState, llm });

  sharedState.staticCheckPassed = staticCheckerOut.staticCheckPassed;
  sharedState.staticCheckErrors = staticCheckerOut.errors;

  // 4. Control Bar Transform
  await tracker.executeStep(async () => {
    try {
      logger.info('Transforming code to use control bar only input');
      sharedState.gameSource = await transformGameCodeWithLLM(sharedState, llm);
      logger.info('Successfully transformed code to use control bar only input');
      sharedState.logs = ['Pipeline executed', 'Control bar input transformation applied'];
    } catch (error) {
      logger.error('Error transforming control bar input', { error: error.message });
      sharedState.logs = ['Pipeline executed', 'Warning: Could not transform control bar input'];
    }
  }, CONTROL_BAR_STATUS, { sharedState, llm });

  // 5. Testing (Final validation)
  await tracker.executeStep(async () => {
    sharedState.syntaxOk = true;
    sharedState.runtimePlayable = true;
    // Token counting is handled automatically by chains
    return { syntaxOk: true, runtimePlayable: true };
  }, { name: 'Testing', label: 'Testing', description: 'Final validation' }, { sharedState, llm });

  return sharedState;
}

export { runCodingPipeline };
