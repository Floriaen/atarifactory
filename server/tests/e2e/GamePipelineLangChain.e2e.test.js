// E2E Test for Modular Agent Pipeline (Test-Driven Outline)
// This test defines the expected modular pipeline flow and output structure.
// It uses deterministic mocks for LLM outputs to ensure reproducibility.

jest.setTimeout(30000);
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { runModularGameSpecPipeline } = require('../../agents/langchain/pipeline/pipeline');

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
    expect(result.gameDef.name).toBeDefined();
    expect(typeof result.gameDef.name).toBe('string');
    expect(result.plan.length).toBeGreaterThan(0);
    expect(result.contextSteps).toBeDefined();
    expect(typeof result.feedback).toBe('string');
    expect(result.feedback.length).toBeGreaterThan(0);
    expect(result.staticCheckPassed).toBe(true);
    // Loosened: check that plan is non-empty and contains plausible gameplay steps
    const planDescriptions = result.plan.map(step => step.description || '').join(' ');
    expect(planDescriptions.length).toBeGreaterThan(0);
    // At least one step should mention 'gravity', 'collision', or 'platform' (case-insensitive)
    expect(planDescriptions).toMatch(/gravity|collision|platform/i);
    expect(result.syntaxOk).toBe(true);
    expect(result.runtimePlayable).toBe(true);
    expect(result.logs).toBeDefined(); // If logs are returned
  });
});
