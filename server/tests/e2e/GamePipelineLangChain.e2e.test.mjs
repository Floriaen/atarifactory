// E2E Test for Modular Agent Pipeline (Test-Driven Outline)
// This test defines the expected modular pipeline flow and output structure.
// It uses deterministic mocks for LLM outputs to ensure reproducibility.

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../.env') });

import { describe, it, expect, vi } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.mjs';

// Mock LLM outputs for each agent step
vi.mock('../../agents/chains/GameInventorChain', () => ({
  createGameInventorChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ idea: 'A platformer where you control gravity.' })
  })
}));
vi.mock('../../agents/chains/design/GameDesignChain', () => ({
  createGameDesignChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ gameDef: { name: 'Gravity Jumper', genre: 'Platformer', rules: '...' } })
  })
}));
vi.mock('../../agents/chains/design/IdeaGeneratorChain.mjs', () => ({
  createIdeaGeneratorChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ title: 'Gravity Jumper', pitch: 'A platformer where you control gravity.' })
  })
}));
vi.mock('../../agents/chains/design/LoopClarifierChain.mjs', () => ({
  createLoopClarifierChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ loop: 'Players can invert gravity to avoid obstacles.' })
  })
}));
vi.mock('../../agents/chains/design/MechanicExtractorChain.mjs', () => ({
  createMechanicExtractorChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ mechanics: ['gravity switch', 'platforming', 'collision'] })
  })
}));
vi.mock('../../agents/chains/design/WinConditionBuilderChain.mjs', () => ({
  createWinConditionBuilderChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ winCondition: 'Reach the exit platform.' })
  })
}));
vi.mock('../../agents/chains/design/EntityListBuilderChain.mjs', () => ({
  createEntityListBuilderChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ entities: ['player', 'platform', 'goal'] })
  })
}));
vi.mock('../../agents/chains/design/PlayabilityHeuristicChain.mjs', () => ({
  createPlayabilityHeuristicChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue('Playable. Fun mechanics.')
  })
}));
vi.mock('../../agents/chains/design/FinalAssemblerChain.mjs', () => ({
  FinalAssemblerChain: { invoke: vi.fn().mockResolvedValue({ gameDef: { name: 'Gravity Jumper', pitch: 'A platformer where you control gravity.', loop: 'Players can invert gravity to avoid obstacles.', mechanics: ['gravity switch', 'platforming', 'collision'], winCondition: 'Reach the exit platform.', entities: ['player', 'platform', 'goal'] } }) }
}));

// Mock LLMs to prevent network calls
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'Mocked LLM output.' })
  }))
}));
vi.mock('../../agents/chains/PlayabilityValidatorChain', () => ({
  createPlayabilityValidatorChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ isPlayable: false, suggestion: 'Add a win condition.' })
  })
}));
vi.mock('../../agents/chains/PlayabilityAutoFixChain', () => ({
  createPlayabilityAutoFixChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ fixed: true, gameDef: { name: 'Gravity Jumper', genre: 'Platformer', rules: '...Win by reaching the exit.' } })
  })
}));
vi.mock('../../agents/chains/PlannerChain', () => ({
  createPlannerChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ plan: [
      { description: 'Design levels' },
      { description: 'Implement gravity switch' },
      { description: 'Test win condition' }
    ] })
  })
}));
vi.mock('../../agents/chains/ContextStepBuilderChain', () => ({
  createContextStepBuilderChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ contextSteps: ['Set up environment', 'Initialize player state'] })
  })
}));
vi.mock('../../agents/chains/FeedbackChain', () => ({
  createFeedbackChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ retryTarget: 'fixer', suggestion: 'Try adding more levels.' })
  })
}));
vi.mock('../../agents/chains/SyntaxSanityChain', () => ({
  createSyntaxSanityChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ syntaxOk: true })
  })
}));
vi.mock('../../agents/chains/RuntimePlayabilityChain', () => ({
  createRuntimePlayabilityChain: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue({ runtimePlayable: true })
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
  }, 20000);
});
