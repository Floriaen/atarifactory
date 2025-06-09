const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const StepBuilderAgent = require('../../agents/StepBuilderAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { extractJsCodeBlocks } = require('../../utils/formatter');

// Mock logger for clean test output
const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;

describe('Agent Chain Integration', () => {
  let mockOpenAI;
  const traceId = 'integration-test';

  beforeEach(() => {
    mockOpenAI = new MockOpenAI();
  });

  it('should chain GameDesignAgent -> PlannerAgent -> StepBuilderAgent successfully', async () => {
    // 1. GameDesignAgent
    const gameDef = await GameDesignAgent(
      { title: 'Test Game' },
      { logger, traceId, llmClient: mockOpenAI }
    );
    expect(gameDef).toHaveProperty('title');
    expect(gameDef).toHaveProperty('mechanics');
    expect(gameDef).toHaveProperty('winCondition');
    expect(gameDef).toHaveProperty('entities');

    // 2. PlannerAgent
    const plan = await PlannerAgent(
      gameDef,
      { logger, traceId, llmClient: mockOpenAI }
    );
    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]).toHaveProperty('id');
    expect(plan[0]).toHaveProperty('label');

    // 3. StepBuilderAgent (first step)
    const stepCode = await StepBuilderAgent(
      {
        currentCode: '',
        plan,
        step: plan[0]
      },
      { logger, traceId, llmClient: mockOpenAI }
    );
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
    const gameDef = await GameDesignAgent(
      { title: 'Test Game' },
      { logger, traceId, llmClient: mockOpenAI }
    );
    expect(gameDef).toBeDefined();

    // 2. PlannerAgent should fail
    await expect(
      PlannerAgent(gameDef, { logger, traceId, llmClient: failingMock })
    ).rejects.toThrow('Mock LLM failure');

    // 3. StepBuilderAgent should not be called
    const plan = [
      { id: 1, label: 'Test Step' }
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
    const gameDef = await GameDesignAgent(
      { title: 'Test Game' },
      { logger, traceId, llmClient: mockOpenAI }
    );

    // 2. Get plan
    const plan = await PlannerAgent(
      gameDef,
      { logger, traceId, llmClient: mockOpenAI }
    );

    // 3. Execute first step
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