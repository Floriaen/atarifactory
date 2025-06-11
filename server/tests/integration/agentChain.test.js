const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const StepBuilderAgent = require('../../agents/StepBuilderAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { extractJsCodeBlocks } = require('../../utils/formatter');
const { createSharedState } = require('../../types/SharedState');

// Mock logger for clean test output
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

describe('Agent Chain Integration', () => {
  let mockOpenAI;
  const traceId = 'integration-test';
  const sharedState = createSharedState();

  beforeEach(() => {
    mockOpenAI = new MockOpenAI();
  });

  it('should chain GameDesignAgent -> PlannerAgent -> StepBuilderAgent successfully', async () => {
    // 1. GameDesignAgent
    mockOpenAI.setAgent('GameDesignAgent');
    sharedState.title = 'Test Game';
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    sharedState.gameDef = gameDef;
    expect(gameDef).toHaveProperty('title');
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

    // 3. StepBuilderAgent (first step)
    sharedState.step = sharedState.plan[0];
    mockOpenAI.setAgent('StepBuilderAgent');
    const stepCode = await StepBuilderAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    expect(typeof stepCode).toBe('string');
    expect(stepCode.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully in the chain', async () => {
    // Mock a failure in PlannerAgent
    const failingMock = {
      chatCompletion: async () => {
        throw new Error('Mock LLM failure');
      }
    };

    // 1. GameDesignAgent should succeed
    mockOpenAI.setAgent('GameDesignAgent');
    sharedState.title = 'Test Game';
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });
    expect(gameDef).toBeDefined();

    // 2. PlannerAgent should fail
    await expect(
      PlannerAgent(sharedState, { logger, traceId, llmClient: failingMock })
    ).rejects.toThrow('Mock LLM failure');

    // 3. StepBuilderAgent should not be called
    const plan = [
      { id: 1, description: 'Test Step' }
    ];
    await expect(
      StepBuilderAgent(
        { currentCode: '', plan, step: plan[0] },
        { logger, traceId, llmClient: failingMock }
      )
    ).rejects.toThrow('Mock LLM failure');
  });

  // TODO: Re-enable after context refactoring. This test needs step context for mocks to return correct responses.
  // The mock needs to know which step is being processed to return the appropriate code (canvas setup vs player controls).
  it.skip('should maintain state between steps in the chain', async () => {
    // 1. Get game design
    mockOpenAI.setAgent('GameDesignAgent');
    sharedState.title = 'Test Game';
    const gameDef = await GameDesignAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });

    // 2. Get plan
    mockOpenAI.setAgent('PlannerAgent');
    const plan = await PlannerAgent(sharedState, { logger, traceId, llmClient: mockOpenAI });

    // 3. Execute first step
    sharedState.step = sharedState.plan[0];
    mockOpenAI.setAgent('StepBuilderAgent');
    const firstStepCode = await StepBuilderAgent(
      {
        currentCode: '',
        plan,
        step: plan[0]
      },
      { logger, traceId, llmClient: mockOpenAI }
    );

    // 4. Execute second step with first step's code as context
    const secondStepCode = await StepBuilderAgent(
      {
        currentCode: firstStepCode,
        plan,
        step: plan[1]
      },
      { logger, traceId, llmClient: mockOpenAI }
    );

    // Verify that both steps contain their expected code patterns
    expect(firstStepCode).toContain('canvas');
    expect(firstStepCode).toContain('gameLoop');
    expect(secondStepCode).toContain('player');
    expect(secondStepCode).toContain('keys');
    expect(secondStepCode).toContain('ArrowLeft');
    expect(secondStepCode).toContain('ArrowRight');

    // Verify that the code blocks are different by checking their content
    const firstStepLines = firstStepCode.split('\n');
    const secondStepLines = secondStepCode.split('\n');
    expect(firstStepLines).not.toEqual(secondStepLines);

    // Verify that the second step's code is longer than the first step's code
    expect(secondStepLines.length).toBeGreaterThan(firstStepLines.length);
  });
}); 