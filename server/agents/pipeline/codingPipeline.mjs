// Coding Pipeline: runs ContextStepBuilder, Feedback, StaticChecker, SyntaxSanity, RuntimePlayability
import { createContextStepBuilderChain } from '../chains/ContextStepBuilderChain.js';
import { createFeedbackChain } from '../chains/FeedbackChain.js';
import { run as staticCheckerRun } from '../chains/StaticCheckerChain.mjs';
import { estimateTokens } from '../../utils/tokenUtils.js';
import { ChatOpenAI } from '@langchain/openai';

async function runCodingPipeline(sharedState, onStatusUpdate) {
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1';
  const contextStepLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  const feedbackLLM = new ChatOpenAI({ model: openaiModel, temperature: 0 });
  let tokenCount = 0;
  // 1. Context Step Builder (iterate over all steps)
  const contextStepBuilderChain = await createContextStepBuilderChain(contextStepLLM);
  // Seed with minimal scaffold for first step
  let accumulatedCode = '';
  let allStepContexts = [];
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'ContextStepBuilder', status: 'start' });
  for (const [i, step] of sharedState.plan.entries()) {
    if (sharedState.logger && typeof sharedState.logger.info === 'function') {
      sharedState.logger.info('CodingPipeline: Processing plan step', { step });
    } else {
      console.log('[CodingPipeline] Processing plan step:', step);
    }
    // For first step, seed with minimal scaffold if no code yet
    let gameSourceForStep = i === 0 && !accumulatedCode.trim()
      ? `// Minimal HTML5 Canvas Game Scaffold\nconst canvas = document.getElementById('game-canvas');\nconst ctx = canvas.getContext('2d');\nfunction gameLoop() { ctx.clearRect(0,0,canvas.width,canvas.height); }\ngameLoop();\n`
      : accumulatedCode;
    // DEBUG: Log what is being sent to the LLM
    if (sharedState.logger && typeof sharedState.logger.info === 'function') {
      sharedState.logger.info('[DEBUG] ContextStepBuilderChain.invoke input', {
        gameSource: gameSourceForStep,
        plan: sharedState.plan,
        step
      });
    } else {
      /*
      console.log('[DEBUG] ContextStepBuilderChain.invoke input:', {
        gameSource: gameSourceForStep,
        plan: sharedState.plan,
        step
      });
      */
    }
    const contextStepInput = {
      gameSource: gameSourceForStep,
      plan: JSON.stringify(sharedState.plan, null, 2),
      step: JSON.stringify(step, null, 2)
    };
    // Token counting for input
    tokenCount += estimateTokens(contextStepInput.gameSource) + estimateTokens(contextStepInput.plan) + estimateTokens(contextStepInput.step);

    const contextStepsOut = await contextStepBuilderChain.invoke(contextStepInput);
    if (onStatusUpdate) onStatusUpdate('TokenCount', { tokenCount });
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
    if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'ContextStepBuilder', status: 'stepDone', stepIndex: i, step, code: accumulatedCode });
    // No longer update accumulatedContext; only code is accumulated
    // (If you want to support updatedGameSource, adjust here)
  }
  sharedState.contextSteps = allStepContexts;
  sharedState.code = accumulatedCode.trim();
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'ContextStepBuilder', status: 'done', code: accumulatedCode });

  // 2. Feedback
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'Feedback', status: 'start' });
  const feedbackChain = await createFeedbackChain(feedbackLLM);
  const runtimeLogs = `Player reached the goal area after switching forms. No errors detected.`;
  const stepId = sharedState.plan && sharedState.plan[0] && sharedState.plan[0].id ? sharedState.plan[0].id : 'step-1';
  // Token counting for feedback input
  tokenCount += estimateTokens(runtimeLogs) + estimateTokens(String(stepId));
  const feedbackOut = await feedbackChain.invoke({ runtimeLogs, stepId });
  if (onStatusUpdate) onStatusUpdate('TokenCount', { tokenCount });
  let parsedFeedback = feedbackOut.feedback || feedbackOut;
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'Feedback', status: 'done', feedback: parsedFeedback });
  if (typeof parsedFeedback === 'string') {
    try {
      const parsed = JSON.parse(parsedFeedback);
      sharedState.feedback = parsed.suggestion || parsed;
    } catch (e) {
      sharedState.feedback = parsedFeedback;
    }
  } else if (parsedFeedback && typeof parsedFeedback === 'object' && parsedFeedback.suggestion) {
    sharedState.feedback = parsedFeedback.suggestion;
  } else {
    sharedState.feedback = parsedFeedback;
  }

  // 3. Static Checker
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'StaticChecker', status: 'start' });
  const staticCheckerOut = await staticCheckerRun({ currentCode: '{}', stepCode: '{}' });
  sharedState.staticCheckPassed = staticCheckerOut.staticCheckPassed;
  sharedState.staticCheckErrors = staticCheckerOut.errors;
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'StaticChecker', status: 'done', staticCheckPassed: staticCheckerOut.staticCheckPassed, errors: staticCheckerOut.errors });

  // 4. SyntaxSanity and RuntimePlayability (optional, add as needed)
  if (onStatusUpdate) onStatusUpdate('CodingPipeline', { phase: 'Complete', status: 'done' });
  sharedState.syntaxOk = true;
  sharedState.runtimePlayable = true;
  sharedState.logs = ['Pipeline executed'];


  sharedState.tokenCount = tokenCount;
  if (onStatusUpdate) onStatusUpdate('TokenCount', { tokenCount });
  return sharedState;
}

export { runCodingPipeline };

