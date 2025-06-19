const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const PlayabilityValidatorAgent = require('../../agents/PlayabilityValidatorAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');

// Mock logger for clean test output
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

describe('Agent Chain Integration', () => {
  let mockOpenAI;
  const traceId = 'integration-test';
  let sharedState;

  beforeEach(() => {
    mockOpenAI = new MockOpenAI();
    sharedState = createSharedState();
    sharedState.name = 'Test Game';
    sharedState.description = 'A test game for integration chaining.';  
  });

  it('should chain GameDesignAgent -> PlannerAgent -> PlayabilityValidatorAgent successfully', async () => {
    // 1. GameDesignAgent
    mockOpenAI.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    sharedState.gameDef = gameDef;
    expect(gameDef).toHaveProperty('name');
    expect(gameDef).toHaveProperty('mechanics');
    expect(gameDef).toHaveProperty('winCondition');
    expect(gameDef).toHaveProperty('entities');

    // 2. PlannerAgent
    mockOpenAI.setAgent('PlannerAgent');
    const plan = await PlannerAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    sharedState.plan = plan;
    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]).toHaveProperty('id');
    expect(plan[0]).toHaveProperty('description');

    // 3. PlayabilityValidatorAgent (validate gameDef)
    const validationResult = await PlayabilityValidatorAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    expect(validationResult).toHaveProperty('isPlayable');
    expect(validationResult.isPlayable).toBe(true);
  });

  // The error-handling tests are skipped, matching your decision to keep the mock simple and deterministic.
  it.skip('should handle errors gracefully in the chain', async () => {
    // Mock a failure in PlannerAgent
    const failingMock = {
      chatCompletion: async () => {
        throw new Error('Mock LLM failure');
      }
    };

    // 1. GameDesignAgent should succeed
    mockOpenAI.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    expect(gameDef).toBeDefined();

    // 2. PlannerAgent should fail
    await expect(
      PlannerAgent(sharedState, { logger, traceId, llmClient: failingMock })
    ).rejects.toThrow('Mock LLM failure');

    // 3. PlayabilityValidatorAgent should not be called
    // Use mockOpenAI for PlayabilityValidatorAgent error simulation
    mockOpenAI.setAgent('PlayabilityValidatorAgent');
    // Set up sharedState so the prompt includes 'Mock LLM failure' (simulate error)
    sharedState.currentStep = { id: 1, description: 'Mock LLM failure' };
    const result = await PlayabilityValidatorAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    expect(result.isPlayable).toBe(false);
    expect(result.reason).toMatch(/Mock LLM failure/);
  });

  // The error-handling tests are skipped, matching your decision to keep the mock simple and deterministic.
  it.skip('should handle errors in PlayabilityValidatorAgent gracefully', async () => {
    // 1. GameDesignAgent
    mockOpenAI.setAgent('GameDesignAgent');
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    sharedState.gameDef = gameDef;

    // 2. PlannerAgent
    mockOpenAI.setAgent('PlannerAgent');
    const plan = await PlannerAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    sharedState.plan = plan;

    // 3. PlayabilityValidatorAgent should fail
    const failingValidator = async () => { throw new Error('Mock Validator Failure'); };
    await expect(
      failingValidator(sharedState, { logger, traceId, llmClient: mockOpenAI })
    ).rejects.toThrow('Mock Validator Failure');
  });
}); 