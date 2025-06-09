/**
 * Integration test for the agent pipeline:
 * GameDesignAgent → PlannerAgent → StepBuilderAgent → BlockInserterAgent
 *
 * Modes:
 * - Mock LLM: Default
 * - Real LLM: Set OPENAI_API_KEY
 * - Logging: Set TEST_LOGS=1
 */
const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const StepBuilderAgent = require('../../agents/StepBuilderAgent');
const BlockInserterAgent = require('../../agents/BlockInserterAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const logger = require('../../utils/logger');
const prettier = require('prettier');

// Helper to format code for easier assertions
function format(code) {
  return prettier.format(code, { parser: 'babel' });
}

describe('Pipeline Integration', () => {
  it('should process game design through to code generation', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';

    // 1. Game Design
    mockLlmClient.setAgent(GameDesignAgent);
    const gameDef = await GameDesignAgent({ title: 'Test Game' }, { llmClient: mockLlmClient, logger, traceId });
    expect(gameDef).toHaveProperty('title');
    expect(gameDef).toHaveProperty('mechanics');

    // 2. Plan
    mockLlmClient.setAgent(PlannerAgent);
    const plan = await PlannerAgent({ gameDef }, { llmClient: mockLlmClient, logger, traceId });
    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBeGreaterThan(0);

    // 3. Step code (first step)
    mockLlmClient.setAgent(StepBuilderAgent);
    const stepCode = await StepBuilderAgent(
      { currentCode: '', plan, step: plan[0] },
      { llmClient: mockLlmClient, logger, traceId }
    );
    expect(typeof stepCode).toBe('string');
    expect(stepCode.length).toBeGreaterThan(0);

    // 4. Merge code
    const mergedCode = await BlockInserterAgent(
      { currentCode: '', stepCode },
      { logger, traceId }
    );
    expect(typeof mergedCode).toBe('string');
    expect(mergedCode.length).toBeGreaterThan(0);
    // Optionally, check for valid JS (parse or format)
    expect(() => format(mergedCode)).not.toThrow();
  });

  it('should handle error in StepBuilderAgent gracefully', async () => {
    const mockLlmClient = new MockOpenAI();
    const traceId = 'test-trace';

    // 1. Game Design
    mockLlmClient.setAgent(GameDesignAgent);
    const gameDef = await GameDesignAgent({ title: 'Test Game' }, { llmClient: mockLlmClient, logger, traceId });

    // 2. Plan
    mockLlmClient.setAgent(PlannerAgent);
    const plan = await PlannerAgent({ gameDef }, { llmClient: mockLlmClient, logger, traceId });

    // 3. Try to build an invalid step
    mockLlmClient.setAgent(StepBuilderAgent);
    const badStep = { id: 999, label: 'Nonexistent step' };
    await expect(
      StepBuilderAgent({ currentCode: '', plan, step: badStep }, { llmClient: mockLlmClient, logger, traceId })
    ).rejects.toThrow();
  });
}); 