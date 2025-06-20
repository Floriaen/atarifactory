// E2E Test for Modular Agent Pipeline (Test-Driven Outline)
// This test defines the expected modular pipeline flow and output structure.
// It uses deterministic mocks for LLM outputs to ensure reproducibility.

jest.setTimeout(30000);
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { runModularGameSpecPipeline } = require('../../agents/langchain/pipeline/pipeline');

// Mock LLM outputs for each agent step
jest.mock('../../agents/langchain/chains/GameInventorChain', () => ({
  createGameInventorChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ idea: 'A platformer where you control gravity.' })
  })
}));
jest.mock('../../agents/langchain/chains/design/GameDesignChain', () => ({
  createGameDesignChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ gameDef: { name: 'Gravity Jumper', genre: 'Platformer', rules: '...' } })
  })
}));
jest.mock('../../agents/langchain/chains/PlayabilityValidatorChain', () => ({
  createPlayabilityValidatorChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ isPlayable: false, suggestion: 'Add a win condition.' })
  })
}));
jest.mock('../../agents/langchain/chains/PlayabilityAutoFixChain', () => ({
  createPlayabilityAutoFixChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ fixed: true, gameDef: { name: 'Gravity Jumper', genre: 'Platformer', rules: '...Win by reaching the exit.' } })
  })
}));
jest.mock('../../agents/langchain/chains/PlannerChain', () => ({
  createPlannerChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ plan: [
      { description: 'Design levels' },
      { description: 'Implement gravity switch' },
      { description: 'Test win condition' }
    ] })
  })
}));
jest.mock('../../agents/langchain/chains/ContextStepBuilderChain', () => ({
  createContextStepBuilderChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ contextSteps: ['Set up environment', 'Initialize player state'] })
  })
}));
jest.mock('../../agents/langchain/chains/FeedbackChain', () => ({
  createFeedbackChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ feedback: 'Game is engaging but needs more levels.' })
  })
}));
jest.mock('../../agents/langchain/chains/SyntaxSanityChain', () => ({
  createSyntaxSanityChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ syntaxOk: true })
  })
}));
jest.mock('../../agents/langchain/chains/RuntimePlayabilityChain', () => ({
  createRuntimePlayabilityChain: jest.fn().mockReturnValue({
    invoke: jest.fn().mockResolvedValue({ runtimePlayable: true })
  })
}));

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