// E2E Test for Modular Agent Pipeline (Test-Driven Outline)
// This test defines the expected modular pipeline flow and output structure.
// It uses deterministic mocks for LLM outputs to ensure reproducibility.

const { runModularGameSpecPipeline } = require('../../agents/langchain/pipeline');

// Mock LLM outputs for each agent step
defineMockLLMOutputs();

function defineMockLLMOutputs() {
  // Mock for GameInventorAgent
  jest.mock('../../agents/langchain/GameInventorChain', () => ({
    run: jest.fn().mockResolvedValue({
      idea: 'A platformer where you control gravity.'
    })
  }));
  // Mock for GameDesignAgent
  jest.mock('../../agents/langchain/GameDesignChain', () => ({
    run: jest.fn().mockResolvedValue({
      gameDef: { title: 'Gravity Jumper', genre: 'Platformer', rules: '...' }
    })
  }));
  // Mock for PlayabilityValidatorAgent
  jest.mock('../../agents/langchain/PlayabilityValidatorChain', () => ({
    run: jest.fn().mockResolvedValue({
      isPlayable: false,
      suggestion: 'Add a win condition.'
    })
  }));
  // Mock for PlayabilityAutoFixAgent
  jest.mock('../../agents/langchain/PlayabilityAutoFixChain', () => ({
    run: jest.fn().mockResolvedValue({
      fixed: true,
      gameDef: { title: 'Gravity Jumper', genre: 'Platformer', rules: '...Win by reaching the exit.' }
    })
  }));
  // Mock for PlannerAgent
  jest.mock('../../agents/langchain/PlannerChain', () => ({
    run: jest.fn().mockResolvedValue({
      plan: ['Design levels', 'Implement gravity switch', 'Test win condition']
    })
  }));
  // Mock for ContextStepBuilderAgent
  jest.mock('../../agents/langchain/ContextStepBuilderChain', () => ({
    run: jest.fn().mockResolvedValue({
      contextSteps: ['Set up environment', 'Initialize player state']
    })
  }));
  // Mock for FeedbackAgent
  jest.mock('../../agents/langchain/FeedbackChain', () => ({
    run: jest.fn().mockResolvedValue({
      feedback: 'Game is engaging but needs more levels.'
    })
  }));
  // Mock for StaticCheckerAgent
  jest.mock('../../agents/langchain/StaticCheckerChain', () => ({
    run: jest.fn().mockResolvedValue({
      staticCheckPassed: true
    })
  }));
  // Mock for StepBuilderAgent
  jest.mock('../../agents/langchain/StepBuilderChain', () => ({
    run: jest.fn().mockResolvedValue({
      steps: ['Step 1: Start', 'Step 2: Jump', 'Step 3: Win']
    })
  }));
  // Mock for StepFixerAgent
  jest.mock('../../agents/langchain/StepFixerChain', () => ({
    run: jest.fn().mockResolvedValue({
      fixedSteps: ['Step 1: Start', 'Step 2: Jump', 'Step 3: Win (fixed)']
    })
  }));
  // Mock for SyntaxSanityAgent
  jest.mock('../../agents/langchain/SyntaxSanityChain', () => ({
    run: jest.fn().mockResolvedValue({
      syntaxOk: true
    })
  }));
  // Mock for RuntimePlayabilityAgent
  jest.mock('../../agents/langchain/RuntimePlayabilityChain', () => ({
    run: jest.fn().mockResolvedValue({
      runtimePlayable: true
    })
  }));
}


describe('Modular Agent Pipeline', () => {
  it('should run the modular pipeline and return a valid, playable game definition and plan', async () => {
    const input = { title: 'Platformer', logger: console };
    const result = await runModularGameSpecPipeline(input);

    // Assert pipeline completed successfully
    expect(result).toBeDefined();
    expect(result.gameDef).toBeDefined();
    expect(result.plan).toBeInstanceOf(Array);
    expect(result.gameDef.title).toBe('Gravity Jumper');
    expect(result.gameDef.rules).toMatch(/Win by reaching the exit/);
    expect(result.plan).toContain('Test win condition');
    expect(result.contextSteps).toContain('Initialize player state');
    expect(result.feedback).toMatch(/engaging/);
    expect(result.staticCheckPassed).toBe(true);
    expect(result.steps).toContain('Step 2: Jump');
    expect(result.fixedSteps).toContain('Step 3: Win (fixed)');
    expect(result.syntaxOk).toBe(true);
    expect(result.runtimePlayable).toBe(true);
    expect(result.logs).toBeDefined(); // If logs are returned
  });
});
