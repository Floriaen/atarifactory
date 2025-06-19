/**
 * Integration test for the pipeline-v3 agent sequence:
 * GameDesignAgent → PlannerAgent → ContextStepBuilderAgent → BlockInserterAgent → StaticCheckerAgent → SyntaxSanityAgent → RuntimePlayabilityAgent → FeedbackAgent
 *
 * Modes:
 * - Mock LLM: Default
 * - Real LLM: Set OPENAI_API_KEY
 * - Logging: Set TEST_LOGS=1
 */
const GameInventorAgent = require('../../agents/GameInventorAgent');
const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const ContextStepBuilderAgent = require('../../agents/ContextStepBuilderAgent');
const StaticCheckerAgent = require('../../agents/StaticCheckerAgent');
const SyntaxSanityAgent = require('../../agents/SyntaxSanityAgent');
const RuntimePlayabilityAgent = require('../../agents/RuntimePlayabilityAgent');
const FeedbackAgent = require('../../agents/FeedbackAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const logger = require('../../utils/logger');
const prettier = require('prettier');
const { createSharedState } = require('../../types/SharedState');

// Helper to format code for easier assertions
function format(code) {
  return prettier.format(code, { parser: 'babel' });
}

describe('Pipeline Integration', () => {
  it('should use the invented name/description in the game design', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';
    const sharedState = createSharedState();
    sharedState.gameSource = '';
    mockLlmClient.setAgent('GameInventorAgent');
    const invention = await GameInventorAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });
    mockLlmClient.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });
    // The test should fail if GameDesignAgent output is static or unrelated
    // For now, this will pass only if the agent uses invention.name/description
    expect(gameDef.name).not.toBe('Coin Collector');
    expect(gameDef.name).toMatch(new RegExp(invention.name, 'i'));
    expect(gameDef.description).toMatch(new RegExp(invention.description.split(' ')[0], 'i'));
  });
  jest.setTimeout(20000);
  it('should process game design through to code generation', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';

    // 1. Game Inventor
    const sharedState = createSharedState();
    sharedState.gameSource = '';
    mockLlmClient.setAgent('GameInventorAgent');
    const invention = await GameInventorAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });
    expect(typeof invention).toBe('object');
    expect(invention).toHaveProperty('name');
    expect(invention).toHaveProperty('description');
    expect(sharedState.name).toBe(invention.name);
    expect(sharedState.description).toBe(invention.description);

    // 2. Game Design
    mockLlmClient.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });
    sharedState.gameDef = gameDef;

    // 2. Plan
    mockLlmClient.setAgent('PlannerAgent');
    const plan = await PlannerAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });
    sharedState.plan = plan;

    // 3. ContextStepBuilderAgent (first step)
    sharedState.currentStep = sharedState.plan[0];
    // Debug: Print plan and currentStep
    // eslint-disable-next-line no-console
    console.log('DEBUG: sharedState.plan =', JSON.stringify(sharedState.plan));
    // eslint-disable-next-line no-console
    console.log('DEBUG: sharedState.currentStep =', JSON.stringify(sharedState.currentStep));
  
    mockLlmClient.setAgent('ContextStepBuilderAgent');
    const revisedSource = await ContextStepBuilderAgent(sharedState, { logger, traceId: 'test-trace', llmClient: mockLlmClient });
    expect(typeof revisedSource).toBe('string');
    expect(revisedSource.length).toBeGreaterThan(0);
    sharedState.gameSource = revisedSource;

    // 4. [BlockInserterAgent removed]
    // In pipeline-v3, revisedSource is the full code. Assign directly.
    sharedState.currentCode = revisedSource;
    expect(typeof sharedState.currentCode).toBe('string');
    expect(sharedState.currentCode.length).toBeGreaterThan(0);
    expect(() => format(sharedState.currentCode)).not.toThrow();

    // 5. StaticCheckerAgent
    const errors = await StaticCheckerAgent(sharedState, { logger, traceId });
    expect(Array.isArray(errors)).toBe(true);
    sharedState.errors = errors;

    // 6. SyntaxSanityAgent
    const syntaxResult = SyntaxSanityAgent(sharedState, { logger, traceId });
    expect(typeof syntaxResult).toBe('object');
    expect(syntaxResult).toHaveProperty('valid');
    sharedState.syntaxResult = syntaxResult;

    // 7. RuntimePlayabilityAgent
    const runtimeResults = await RuntimePlayabilityAgent(sharedState, { logger, traceId });
    expect(typeof runtimeResults).toBe('object');
    expect(runtimeResults).toHaveProperty('canvasActive');
    sharedState.runtimeResults = runtimeResults;

    // 8. FeedbackAgent
    mockLlmClient.setAgent('FeedbackAgent');
    const feedback = await FeedbackAgent(sharedState, { logger, traceId, llmClient: mockLlmClient });
    expect(feedback).toHaveProperty('retryTarget');
    expect(feedback).toHaveProperty('suggestion');
    sharedState.feedback = feedback;
  });


  it('should trigger LLM fallback for ambiguous specs and accept if LLM says winnable', async () => {
    // Mock LLM client that always returns winnable: true for fallback
    class FallbackMockOpenAI extends MockOpenAI {
      async chatCompletion({ prompt, outputType }) {
        if (prompt.includes('game validation agent')) {
          return { winnable: true, suggestion: 'Add "move" mechanic.' };
        }
        return super.chatCompletion({ prompt, outputType });
      }
    }
    const mockLlmClient = new FallbackMockOpenAI();
    const traceId = 'test-trace-ambiguous';
    const sharedState = createSharedState();
    sharedState.name = 'Ambiguous Game';
    sharedState.description = 'Win by escaping the maze.';
    sharedState.gameDef = {
      title: 'Ambiguous Game',
      description: 'Win by escaping the maze.',
      mechanics: ['wait'], // ambiguous for 'escape'
      winCondition: 'Escape the maze.',
      entities: ['player', 'maze']
    };
    let passed = false;
    try {
      await require('../../agents/PlayabilityValidatorAgent')(sharedState, { logger, traceId, llmClient: mockLlmClient });
      passed = true;
    } catch (err) {
      passed = false;
    }
    expect(passed).toBe(true);
  });

  it('should auto-fix unwinnable game designs if LLM provides a suggestion', async () => {
    const PlayabilityAutoFixAgent = require('../../agents/PlayabilityAutoFixAgent');
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace-autofix';
    // Simulate a design where winCondition is unreachable with given mechanics
    const sharedState = createSharedState();
    sharedState.name = 'Impossible Game';
    sharedState.description = 'Win by collecting all coins, but you cannot move.';
    sharedState.gameDef = {
      title: 'Impossible Game',
      description: 'Win by collecting all coins, but you cannot move.',
      mechanics: ['wait'], // No movement or collect
      winCondition: 'All coins collected.',
      entities: ['player', 'coin']
    };
    // Mock LLM so that when PlayabilityValidatorAgent asks, it returns a fix suggestion
    mockLlmClient.chatCompletion = async ({ prompt, outputType }) => {
      if (prompt.includes('game validation agent')) {
        return { winnable: false, suggestion: "Add the 'move' and 'collect' mechanics." };
      }
      return { winnable: false };
    };
    // 1. Validate (should be unplayable, with suggestion)
    const validationResult = await require('../../agents/PlayabilityValidatorAgent')(sharedState, { logger, traceId, llmClient: mockLlmClient });
    expect(validationResult.isPlayable).toBe(false);
    expect(validationResult.suggestion).toMatch(/move/);
    // 2. Auto-fix
    const fixResult = await PlayabilityAutoFixAgent(validationResult, { logger, traceId });
    expect(fixResult.fixed).toBe(true);
    // 3. Re-validate
    const revalidationResult = await require('../../agents/PlayabilityValidatorAgent')({ gameDef: fixResult.gameDef }, { logger, traceId, llmClient: mockLlmClient });
    expect(revalidationResult.isPlayable).toBe(true);
    expect(revalidationResult.gameDef.mechanics).toEqual(expect.arrayContaining(['move', 'collect', 'wait']));
  });
}); 