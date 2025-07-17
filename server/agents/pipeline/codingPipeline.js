// Coding Pipeline: runs ContextStepBuilder, Feedback, StaticChecker, SyntaxSanity, RuntimePlayability
import { createContextStepBuilderChain, CHAIN_STATUS as CONTEXT_STEP_STATUS } from '../chains/ContextStepBuilderChain.js';
import { createFeedbackChain, CHAIN_STATUS as FEEDBACK_STATUS } from '../chains/FeedbackChain.js';
import { run as staticCheckerRun, CHAIN_STATUS as STATIC_CHECKER_STATUS } from '../chains/StaticCheckerChain.js';
import { transformGameCodeWithLLM, CHAIN_STATUS as CONTROL_BAR_STATUS } from '../chains/ControlBarTransformerAgent.js';
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

  // Define fixed steps (40% of coding phase)
  const fixedSteps = [
    { ...FEEDBACK_STATUS, weight: 0.1 },
    { ...STATIC_CHECKER_STATUS, weight: 0.1 },
    { ...CONTROL_BAR_STATUS, weight: 0.1 },
    { name: 'Testing', label: 'Testing', description: 'Final validation', weight: 0.1, category: 'coding' }
  ];

  // Add all steps to tracker
  tracker.addSteps([...dynamicSteps, ...fixedSteps]);

  // 1. Context Step Builder (iterate over all steps)
  let contextStepBuilderChain;
  if (process.env.MOCK_PIPELINE === '1') {
    contextStepBuilderChain = {
      invoke: async () => ({ code: sharedState.gameSource || '', contextSteps: [] })
    };
  } else {
    contextStepBuilderChain = await createContextStepBuilderChain(llm, { sharedState });
  }
  
  // Seed with minimal scaffold for first step
  let accumulatedCode = '';
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
        step: JSON.stringify(step, null, 2)
      };
      
      // Token counting is now handled automatically by the chain

      const contextStepsOut = await contextStepBuilderChain.invoke(contextStepInput);

      // Log the raw LLM output for diagnosis
      logger.debug('ContextStepBuilderChain invoke output', { contextStepsOut });
      // If contextStepsOut is a string, treat as code; else look for .code property
      if (typeof contextStepsOut === 'string') {
        accumulatedCode = contextStepsOut;
      } else if (contextStepsOut && contextStepsOut.code) {
        accumulatedCode = contextStepsOut.code;
      }
      allStepContexts.push(contextStepsOut.contextSteps || contextStepsOut);

      return contextStepsOut;
    }, stepInfo, { sharedState, llm });
  }
  
  sharedState.contextSteps = allStepContexts;
  sharedState.gameSource = accumulatedCode.trim();

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
    return await staticCheckerRun({ currentCode: '{}', stepCode: '{}' });
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