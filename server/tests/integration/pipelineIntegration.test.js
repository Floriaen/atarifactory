/**
 * Integration test for the pipeline-v3 agent sequence:
 * GameDesignAgent → PlannerAgent → ContextStepBuilderAgent → BlockInserterAgent → StaticCheckerAgent → SyntaxSanityAgent → RuntimePlayabilityAgent → FeedbackAgent
 *
 * Modes:
 * - Mock LLM: Default
 * - Real LLM: Set OPENAI_API_KEY
 * - Logging: Set TEST_LOGS=1
 */
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
  jest.setTimeout(20000);
  it('should process game design through to code generation', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';

    // 1. Game Design
    const sharedState = createSharedState();
    sharedState.title = 'Test Game';
    sharedState.gameSource = '';
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

  it('should handle error in StepBuilderAgent gracefully', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';

    // 1. Game Design
    const sharedState = createSharedState();
    sharedState.title = 'Test Game';
    mockLlmClient.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });

    // 2. Plan
    mockLlmClient.setAgent('PlannerAgent');
    const plan = await PlannerAgent(sharedState, { llmClient: mockLlmClient, logger, traceId });

    // 3. Try to build an invalid step with ContextStepBuilderAgent
    mockLlmClient.setAgent('ContextStepBuilderAgent');
    const badStep = { id: 999, description: 'Nonexistent step' };
    const badSharedState = { ...sharedState, currentStep: badStep, gameSource: '', plan };
    await expect(
      ContextStepBuilderAgent(badSharedState, { logger, traceId, llmClient: mockLlmClient })
    ).rejects.toThrow();
  });
}); 