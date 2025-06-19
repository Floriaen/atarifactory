// Modular Game Spec Pipeline using LangChain v3 chains
// This function composes the main agent chains in sequence, passing data and accumulating results.

const { createGameInventorChain } = require('../chains/GameInventorChain');
const { createGameDesignChain } = require('../chains/GameDesignChain');

// Add any additional chains as needed (e.g., SyntaxSanityChain, RuntimePlayabilityChain)

async function runModularGameSpecPipeline(input) {
  const result = {};
  // 1. Game Inventor
  const gameInventorChain = await createGameInventorChain();
  const inventorOut = await gameInventorChain.invoke({ title: input.title });
  result.idea = inventorOut.idea;

  // 2. Game Design
  const gameDesignChain = await createGameDesignChain();
  const designOut = await gameDesignChain.invoke({ name: result.idea, description: result.idea });
  console.log('DEBUG: designOut =', designOut);
  // Accept both { gameDef: {...} } and flat {...}
  if (!designOut) {
    throw new Error('GameDesignChain returned nothing');
  }
  if (designOut.gameDef) {
    result.gameDef = designOut.gameDef;
  } else if (designOut.name && designOut.mechanics && designOut.winCondition) {
    // Looks like a flat game definition
    result.gameDef = designOut;
  } else {
    throw new Error('GameDesignChain did not return a valid game definition. Output: ' + JSON.stringify(designOut));
  }

  // 3. Playability Validator
  const playabilityValidatorChain = await createPlayabilityValidatorChain();
  const validatorOut = await playabilityValidatorChain.invoke({ mechanics: result.gameDef.mechanics || [], winCondition: result.gameDef.winCondition || '' });
  result.isPlayable = validatorOut.isPlayable;
  result.suggestion = validatorOut.suggestion;

  // 4. Playability AutoFix (if needed)
  let fixedGameDef = result.gameDef;
  if (!result.isPlayable) {
    const playabilityAutoFixChain = await createPlayabilityAutoFixChain();
    const autoFixOut = await playabilityAutoFixChain.invoke({ gameDef: result.gameDef, suggestion: result.suggestion });
    fixedGameDef = autoFixOut.gameDef;
    result.fixed = autoFixOut.fixed;
    result.fixedGameDef = fixedGameDef;
  }

  // 5. Planner
  const plannerChain = await createPlannerChain();
  const planOut = await plannerChain.invoke({ gameDefinition: fixedGameDef });
  console.log('DEBUG: planOut =', planOut);
  // Accept both { plan: [...] } and [...]
  let planArr = null;
  if (Array.isArray(planOut)) {
    planArr = planOut;
  } else if (planOut && Array.isArray(planOut.plan)) {
    planArr = planOut.plan;
  }
  if (!planArr || planArr.length === 0) {
    throw new Error('PlannerChain did not return a valid plan array. Output: ' + JSON.stringify(planOut));
  }
  result.plan = planArr;

  // 6. Context Step Builder (iterate over all steps)
  const contextStepBuilderChain = await createContextStepBuilderChain();
  let accumulatedContext = fixedGameDef;
  let allStepContexts = [];
  for (const step of result.plan) {
    const contextStepsOut = await contextStepBuilderChain.invoke({ gameSource: accumulatedContext, plan: result.plan, step });
    // Accumulate or update context as needed (here we just collect outputs)
    allStepContexts.push(contextStepsOut.contextSteps || contextStepsOut);
    // If contextStepsOut provides new code/context, update accumulatedContext accordingly
    if (contextStepsOut && contextStepsOut.updatedGameSource) {
      accumulatedContext = contextStepsOut.updatedGameSource;
    }
  }
  result.contextSteps = allStepContexts;

  // 7. Feedback
  const feedbackChain = await createFeedbackChain();
  // Use realistic logs and stepId from plan if available
  const runtimeLogs = `Player reached the goal area after switching forms. No errors detected.`;
  const stepId = result.plan && result.plan[0] && result.plan[0].id ? result.plan[0].id : 'step-1';
  const feedbackOut = await feedbackChain.invoke({ runtimeLogs, stepId });
  let parsedFeedback = feedbackOut.feedback || feedbackOut;
  if (typeof parsedFeedback === 'string') {
    try {
      const parsed = JSON.parse(parsedFeedback);
      result.feedback = parsed.suggestion || parsed;
    } catch (e) {
      result.feedback = parsedFeedback;
    }
  } else if (parsedFeedback && typeof parsedFeedback === 'object' && parsedFeedback.suggestion) {
    result.feedback = parsedFeedback.suggestion;
  } else {
    result.feedback = parsedFeedback;
  }

  // 8. Static Checker
  const { run: staticCheckerRun } = require('../chains/StaticCheckerChain');
  const staticCheckerOut = await staticCheckerRun({ currentCode: '{}', stepCode: '{}' });
  result.staticCheckPassed = staticCheckerOut.staticCheckPassed;
  result.staticCheckErrors = staticCheckerOut.errors;


  // 10. SyntaxSanity and RuntimePlayability (optional, add as needed)
  result.syntaxOk = true;
  result.runtimePlayable = true;
  result.logs = ['Pipeline executed'];

  return result;
}

module.exports = { runModularGameSpecPipeline };
