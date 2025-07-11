// Integration test for planningPipeline.js progress event emission using ESM mocking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLANNING_PHASE } from '../../config/pipeline.config.js';

const makeMockChain = (output) => ({
  invoke: vi.fn().mockResolvedValue(output)
});

const mockGameInventor = makeMockChain({ idea: 'test idea' });
const mockGameDesign = makeMockChain({
  gameDef: {
    title: 'Test Game',
    mechanics: ['move'],
    winCondition: 'win',
    constraints: ''
  }
});
const mockValidatorPlayable = makeMockChain({ isPlayable: true, suggestion: '' });
const mockValidatorUnplayable = makeMockChain({ isPlayable: false, suggestion: 'fix it' });
const mockHeuristic = makeMockChain({ score: 7 });
const mockAutoFix = makeMockChain({ title: 'Fixed Game', mechanics: ['move'], winCondition: 'win', constraints: '' });
const mockPlanner = makeMockChain([{ step: 'do something' }]);

vi.mock('../../agents/chains/GameInventorChain.js', () => ({
  createGameInventorChain: async () => mockGameInventor
}));
vi.mock('../../agents/chains/design/GameDesignChain.js', () => ({
  createGameDesignChain: async () => mockGameDesign
}));
vi.mock('../../agents/chains/PlayabilityValidatorChain.js', () => ({
  createPlayabilityValidatorChain: vi.fn()
}));
vi.mock('../../agents/chains/design/PlayabilityHeuristicChain.js', () => ({
  createPlayabilityHeuristicChain: async () => mockHeuristic
}));
vi.mock('../../agents/chains/PlayabilityAutoFixChain.js', () => ({
  createPlayabilityAutoFixChain: async () => mockAutoFix
}));
vi.mock('../../agents/chains/PlannerChain.js', () => ({
  createPlannerChain: async () => mockPlanner
}));

import { runPlanningPipeline } from '../../agents/pipeline/planningPipeline.js';
import * as ValidatorModule from '../../agents/chains/PlayabilityValidatorChain.js';

describe('runPlanningPipeline progress events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit correct progress events (no AutoFix)', async () => {
    ValidatorModule.createPlayabilityValidatorChain.mockImplementation(async () => mockValidatorPlayable);
    const sharedState = { plan: [{ step: 'do something' }] };
    const events = [];
    const onStatusUpdate = (type, payload) => {
      if (type === 'Progress') events.push({ ...payload });
    };
    await runPlanningPipeline(sharedState, onStatusUpdate);
    expect(events).toEqual([
      { phase: PLANNING_PHASE, progress: 0.2, tokenCount: 0 },
      { phase: PLANNING_PHASE, progress: 0.4, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.6, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.8, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.99, tokenCount: 5 }
    ]);
  });

  it('should emit correct progress events (with AutoFix)', async () => {
    ValidatorModule.createPlayabilityValidatorChain.mockImplementation(async () => mockValidatorUnplayable);
    const sharedState = { plan: [{ step: 'do something' }] };
    const events = [];
    const onStatusUpdate = (type, payload) => {
      if (type === 'Progress') events.push({ ...payload });
    };
    await runPlanningPipeline(sharedState, onStatusUpdate);
    expect(events).toEqual([
      { phase: PLANNING_PHASE, progress: 0.2, tokenCount: 0 },
      { phase: PLANNING_PHASE, progress: 0.4, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.6, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.8, tokenCount: 5 },
      { phase: PLANNING_PHASE, progress: 0.99, tokenCount: 5 }
    ]);
  });
});