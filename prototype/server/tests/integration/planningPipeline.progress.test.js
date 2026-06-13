// Integration test for planningPipeline.js progress event emission using ESM mocking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLANNING_PHASE } from '../../config/pipeline.config.js';

const makeMockChain = (output) => ({
  invoke: vi.fn().mockResolvedValue(output)
});

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

vi.mock('../../agents/chains/design/GameDesignChain.js', () => ({
  createGameDesignChain: async () => mockGameDesign,
  CHAIN_STATUS: {
    name: 'GameDesignChain',
    label: 'Game Design',
    description: 'Creating game mechanics and entities',
    category: 'planning'
  }
}));
vi.mock('../../agents/chains/PlayabilityValidatorChain.js', () => ({
  createPlayabilityValidatorChain: vi.fn(),
  CHAIN_STATUS: {
    name: 'PlayabilityValidatorChain',
    label: 'Playability Validator',
    description: 'Checking if game design is playable',
    category: 'planning'
  }
}));
vi.mock('../../agents/chains/design/PlayabilityHeuristicChain.js', () => ({
  createPlayabilityHeuristicChain: async () => mockHeuristic,
  CHAIN_STATUS: {
    name: 'PlayabilityHeuristicChain',
    label: 'Playability Heuristic',
    description: 'Scoring game playability',
    category: 'planning'
  }
}));
vi.mock('../../agents/chains/PlayabilityAutoFixChain.js', () => ({
  createPlayabilityAutoFixChain: async () => mockAutoFix
}));
vi.mock('../../agents/chains/PlannerChain.js', () => ({
  createPlannerChain: async () => mockPlanner,
  CHAIN_STATUS: {
    name: 'PlannerChain',
    label: 'Planner',
    description: 'Breaking down game into implementation steps',
    category: 'planning'
  }
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
      if (type === 'Progress') {
        // Extract key fields for comparison, ignore timestamps
        const { timestamp, ...eventWithoutTimestamp } = payload;
        events.push(eventWithoutTimestamp);
      }
    };
    await runPlanningPipeline(sharedState, onStatusUpdate);
    
    // With the new PipelineTracker, we expect start and completion events for each step
    expect(events).toHaveLength(8); // 4 steps × 2 events (start + complete) each
    
    // Check first completion event (Game Design)
    expect(events[1]).toMatchObject({
      phase: {
        name: 'planning',
        label: 'Game Design',
        stepStatus: 'completed',
        totalProgress: 0.25
      },
      progress: 0.25
    });
    expect(events[1]).toHaveProperty('tokenCount');
    expect(typeof events[1].tokenCount).toBe('number');
    
    // Check final completion event (Planner) 
    expect(events[7]).toMatchObject({
      phase: {
        name: 'planning',
        label: 'Planner', 
        stepStatus: 'completed',
        totalProgress: 1
      },
      progress: 1
    });
    expect(events[7]).toHaveProperty('tokenCount');
    expect(typeof events[7].tokenCount).toBe('number');
  });

  it('should emit correct progress events (with AutoFix)', async () => {
    ValidatorModule.createPlayabilityValidatorChain.mockImplementation(async () => mockValidatorUnplayable);
    const sharedState = { plan: [{ step: 'do something' }] };
    const events = [];
    const onStatusUpdate = (type, payload) => {
      if (type === 'Progress') {
        // Extract key fields for comparison, ignore timestamps
        const { timestamp, ...eventWithoutTimestamp } = payload;
        events.push(eventWithoutTimestamp);
      }
    };
    await runPlanningPipeline(sharedState, onStatusUpdate);
    
    // Same expectations as no AutoFix case - AutoFix is conditional and doesn't emit progress events
    expect(events).toHaveLength(8); // 4 steps × 2 events (start + complete) each
    
    // Check first completion event (Game Design)
    expect(events[1]).toMatchObject({
      phase: {
        name: 'planning',
        label: 'Game Design',
        stepStatus: 'completed',
        totalProgress: 0.25
      },
      progress: 0.25
    });
    expect(events[1]).toHaveProperty('tokenCount');
    expect(typeof events[1].tokenCount).toBe('number');
    
    // Check final completion event (Planner)
    expect(events[7]).toMatchObject({
      phase: {
        name: 'planning',
        label: 'Planner',
        stepStatus: 'completed', 
        totalProgress: 1
      },
      progress: 1
    });
    expect(events[7]).toHaveProperty('tokenCount');
    expect(typeof events[7].tokenCount).toBe('number');
  });
});
