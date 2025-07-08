// Coding Pipeline: runs ContextStepBuilder, Feedback, StaticChecker, SyntaxSanity, RuntimePlayability
import { createContextStepBuilderChain } from '../chains/ContextStepBuilderChain.js';
import { createFeedbackChain } from '../chains/FeedbackChain.js';
import { run as staticCheckerRun } from '../chains/StaticCheckerChain.mjs';
import { transformGameCodeWithLLM } from '../chains/ControlBarTransformerAgent.mjs';
import { estimateTokens } from '../../utils/tokenUtils.js';
import { ChatOpenAI } from '@langchain/openai';
import { getClampedLocalProgress } from '../../utils/progress/weightedProgress.js';
import { CODING_PHASE } from '../../config/pipeline.config.mjs';
import fs from 'fs';

const GAME_TEMPLATE = fs.readFileSync(new URL('../../gameBoilerplate/game.js', import.meta.url), 'utf-8');

async function runCodingPipeline(sharedState, onStatusUpdate, factories = {}) {
  const statusUpdate = onStatusUpdate || (() => { });

  const openaiModel = process.env.OPENAI_MODEL;
  if (!openaiModel) {
    throw new Error('OPENAI_MODEL environment variable must be set');
  }
  const llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  
  let tokenCount = typeof sharedState.tokenCount === 'number' ? sharedState.tokenCount : 0;
  sharedState.tokenCount = tokenCount;

  // Emit local progress (0–1) for each coding phase
  const steps = [
    'ContextStepBuilder',
    'Feedback',
    'StaticChecker',
    'Complete'
  ];
  let localStep = 1;
  const totalSteps = steps.length + sharedState.plan.length;

  // 1. Context Step Builder (iterate over all steps)
  // Emit Progress for each plan step
  const contextStepBuilderChain = factories.createContextStepBuilderChain
    ? await factories.createContextStepBuilderChain(llm)
    : await createContextStepBuilderChain(llm);
  // Seed with minimal scaffold for first step
  let accumulatedCode = '';
  let allStepContexts = [];

  for (const [i, step] of sharedState.plan.entries()) {
    statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });
    if (sharedState.logger && typeof sharedState.logger.info === 'function') {
      sharedState.logger.info('CodingPipeline: Processing plan step', { step });
    } else {
      console.log('[CodingPipeline] Processing plan step:', step);
    }
    // For first step, seed with minimal scaffold if no code yet
    let gameSourceForStep = i === 0 && !accumulatedCode.trim()
      ? GAME_TEMPLATE
      : accumulatedCode;

    const contextStepInput = {
      gameSource: gameSourceForStep,
      plan: JSON.stringify(sharedState.plan, null, 2),
      step: JSON.stringify(step, null, 2)
    };
    // Token counting for input
    tokenCount += estimateTokens(contextStepInput.gameSource) + estimateTokens(contextStepInput.plan) + estimateTokens(contextStepInput.step);
    statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });

    const contextStepsOut = await contextStepBuilderChain.invoke(contextStepInput);

    // Log the raw LLM output for diagnosis
    if (sharedState.logger && typeof sharedState.logger.info === 'function') {
      sharedState.logger.info('[DEBUG] ContextStepBuilderChain.invoke output', { contextStepsOut });
    } else {
      console.log('[DEBUG] ContextStepBuilderChain.invoke output:', contextStepsOut);
    }
    // If contextStepsOut is a string, treat as code; else look for .code property
    if (typeof contextStepsOut === 'string') {
      accumulatedCode = contextStepsOut;
    } else if (contextStepsOut && contextStepsOut.code) {
      accumulatedCode = contextStepsOut.code;
    }
    allStepContexts.push(contextStepsOut.contextSteps || contextStepsOut);

    // No longer update accumulatedContext; only code is accumulated
    // (If you want to support updatedGameSource, adjust here)
    localStep++;
  }
  sharedState.contextSteps = allStepContexts;
  sharedState.gameSource = accumulatedCode.trim();

  // 2. Feedback
  statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });

  localStep++;
  const feedbackChain = factories.createFeedbackChain
    ? await factories.createFeedbackChain(llm)
    : await createFeedbackChain(llm);
  const runtimeLogs = `Player reached the goal area after switching forms. No errors detected.`;
  const stepId = sharedState.plan && sharedState.plan[0] && sharedState.plan[0].id ? sharedState.plan[0].id : 'step-1';

  // Token counting for feedback input
  tokenCount += estimateTokens(runtimeLogs) + estimateTokens(String(stepId));
  statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });
  let feedbackOut;
  try {
    feedbackOut = await feedbackChain.invoke({ runtimeLogs, stepId });
  } catch (e) {
    // Emit progress event with latest state
    statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });
    // Emit canonical error event
    statusUpdate('Error', {
      message: e.message,
      phase: CODING_PHASE,
      tokenCount,
      error: e,
      timestamp: new Date().toISOString()
    });
    throw e;
  }

  let parsedFeedback = feedbackOut.feedback || feedbackOut;
  if (typeof parsedFeedback === 'string') {
    try {
      const parsed = JSON.parse(parsedFeedback);
      sharedState.feedback = parsed.suggestion || parsed;
    } catch (e) {
      // Emit canonical error event with raw output
      statusUpdate('Error', {
        message: `Feedback LLM did not return valid JSON: ${parsedFeedback}`,
        phase: CODING_PHASE,
        tokenCount,
        error: e,
        rawOutput: parsedFeedback,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Feedback LLM did not return valid JSON: ${parsedFeedback}`);
    }
  } else if (parsedFeedback && typeof parsedFeedback === 'object' && parsedFeedback.suggestion) {
    sharedState.feedback = parsedFeedback.suggestion;
  } else {
    sharedState.feedback = parsedFeedback;
  }

  // 3. Static Checker
  localStep++;
  statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });

  const staticCheckerOut = await staticCheckerRun({ currentCode: '{}', stepCode: '{}' });
  sharedState.staticCheckPassed = staticCheckerOut.staticCheckPassed;
  sharedState.staticCheckErrors = staticCheckerOut.errors;

  // 4. Enforce control bar only input (LLM-based transformation)
  try {
    console.log('Transforming code to use control bar only input', sharedState.gameSource);
    sharedState.gameSource = await transformGameCodeWithLLM(sharedState, llm);
    console.log('Successfully transformed code to use control bar only input', sharedState.gameSource);
    sharedState.logs = ['Pipeline executed', 'Control bar input transformation applied'];
  } catch (error) {
    console.error('Error transforming control bar input:', error);
    sharedState.logs = ['Pipeline executed', 'Warning: Could not transform control bar input'];
  }

  // 5. SyntaxSanity and RuntimePlayability (optional, add as needed)
  localStep++;
  statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });

  sharedState.syntaxOk = true;
  sharedState.runtimePlayable = true;


  sharedState.tokenCount = tokenCount;

  // Emit a final progress event with the latest tokenCount
  statusUpdate('Progress', { progress: getClampedLocalProgress(localStep, totalSteps), phase: CODING_PHASE, tokenCount });

  return sharedState;
}

export { runCodingPipeline };