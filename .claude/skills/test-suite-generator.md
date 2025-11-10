# Test Suite Generator

A specialized skill for generating comprehensive test suites for AtariFactory's agentic architecture, ensuring 100% test coverage is maintained as orchestration patterns evolve.

## Purpose

Automatically generate unit tests, integration tests, and e2e tests for chains, pipelines, and orchestration logic using MockLLM patterns and Vitest framework. Ensures all new features maintain AtariFactory's high testing standards.

## When to Invoke

- When creating new chains or agents
- When adding orchestration logic (conditional routing, reflection loops)
- When refactoring existing chains
- When the user mentions "test", "coverage", "validate functionality"
- After implementing meta-orchestrator or LangGraph workflows
- When adding new pipeline phases
- Before committing significant architecture changes

## Core Capabilities

### 1. Unit Test Generation for Chains

Generates tests for individual LangChain chains using MockLLM:

```javascript
// /server/tests/unit/orchestration/OrchestratorChain.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createOrchestratorChain } from '../../../agents/chains/orchestration/OrchestratorChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';

describe('OrchestratorChain', () => {
  let mockLLM;
  let sharedState;

  beforeEach(() => {
    sharedState = {
      tokenCount: 0,
      promptTokens: 0,
      completionTokens: 0
    };
  });

  describe('Workflow Decision Making', () => {
    it('should route simple games to fast track', async () => {
      const mockResponse = {
        workflow: 'simple',
        phases: ['design', 'coding'],
        reasoning: 'Simple text-based game does not need art generation',
        estimatedTokens: 5000,
        optimizationsNeeded: []
      };

      mockLLM = new MockLLM(JSON.stringify(mockResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      const result = await chain.invoke({
        title: 'Text Adventure',
        complexity: 'auto'
      });

      expect(result.workflow).toBe('simple');
      expect(result.phases).not.toContain('art');
      expect(result.phases).toContain('coding');
    });

    it('should route complex games through full pipeline', async () => {
      const mockResponse = {
        workflow: 'complex',
        phases: ['design', 'art', 'coding', 'optimize', 'polish'],
        reasoning: 'Complex multi-entity game requires full pipeline with optimizations',
        estimatedTokens: 25000,
        optimizationsNeeded: ['balance', 'performance']
      };

      mockLLM = new MockLLM(JSON.stringify(mockResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      const result = await chain.invoke({
        title: 'Multiplayer Space Combat',
        complexity: 'auto'
      });

      expect(result.workflow).toBe('complex');
      expect(result.phases).toContain('art');
      expect(result.phases).toContain('optimize');
      expect(result.optimizationsNeeded).toHaveLength(2);
    });
  });

  describe('Token Tracking', () => {
    it('should track token usage in sharedState', async () => {
      const mockResponse = {
        workflow: 'standard',
        phases: ['design', 'art', 'coding'],
        reasoning: 'Standard workflow',
        estimatedTokens: 10000
      };

      mockLLM = new MockLLM(JSON.stringify(mockResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      await chain.invoke({ title: 'Game', complexity: 'auto' });

      expect(sharedState.tokenCount).toBeGreaterThan(0);
      expect(sharedState.promptTokens).toBeGreaterThan(0);
      expect(sharedState.completionTokens).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    it('should validate required fields in output', async () => {
      const invalidResponse = {
        workflow: 'simple'
        // Missing required fields: phases, reasoning, estimatedTokens
      };

      mockLLM = new MockLLM(JSON.stringify(invalidResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      await expect(chain.invoke({ title: 'Game', complexity: 'auto' }))
        .rejects.toThrow(); // Zod validation should fail
    });

    it('should accept valid workflow enums', async () => {
      const workflows = ['simple', 'standard', 'complex'];

      for (const workflow of workflows) {
        const mockResponse = {
          workflow,
          phases: ['design', 'coding'],
          reasoning: 'Test',
          estimatedTokens: 1000
        };

        mockLLM = new MockLLM(JSON.stringify(mockResponse));
        const chain = await createOrchestratorChain(mockLLM, sharedState);
        const result = await chain.invoke({ title: 'Game', complexity: 'auto' });

        expect(result.workflow).toBe(workflow);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', async () => {
      const mockResponse = {
        workflow: 'simple',
        phases: ['design', 'coding'],
        reasoning: 'Default workflow',
        estimatedTokens: 5000
      };

      mockLLM = new MockLLM(JSON.stringify(mockResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      const result = await chain.invoke({ title: '', complexity: 'auto' });
      expect(result).toBeTruthy();
    });

    it('should handle unknown complexity values', async () => {
      const mockResponse = {
        workflow: 'standard',
        phases: ['design', 'art', 'coding'],
        reasoning: 'Default to standard for unknown complexity',
        estimatedTokens: 10000
      };

      mockLLM = new MockLLM(JSON.stringify(mockResponse));
      const chain = await createOrchestratorChain(mockLLM, sharedState);

      const result = await chain.invoke({ title: 'Game', complexity: 'unknown' });
      expect(result.workflow).toBe('standard');
    });
  });
});
```

### 2. Integration Test Generation for Pipelines

Tests for pipeline orchestration with conditional routing:

```javascript
// /server/tests/integration/orchestratedPipeline.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { runModularGameSpecPipeline } from '../../agents/pipeline/pipeline.js';
import { createSharedState } from '../../types/SharedState.js';
import { MockLLM } from '../helpers/MockLLM.js';

describe('Orchestrated Pipeline Integration', () => {
  let sharedState;

  beforeEach(() => {
    sharedState = createSharedState();
    sharedState.title = 'Test Game';
  });

  describe('Conditional Routing', () => {
    it('should skip art pipeline for text-only games', async () => {
      // Mock orchestrator to return workflow without art
      const orchestratorMock = new MockLLM(JSON.stringify({
        workflow: 'simple',
        phases: ['design', 'coding'],
        reasoning: 'Text-only game',
        estimatedTokens: 5000
      }));

      // Track which pipelines were invoked
      const pipelinesRun = [];
      const originalOnStatusUpdate = sharedState.onStatusUpdate;
      sharedState.onStatusUpdate = (type, payload) => {
        if (type === 'PipelineStatus') {
          pipelinesRun.push(payload.phase.name);
        }
        originalOnStatusUpdate?.(type, payload);
      };

      await runModularGameSpecPipeline(sharedState);

      expect(pipelinesRun).toContain('design');
      expect(pipelinesRun).toContain('coding');
      expect(pipelinesRun).not.toContain('art');
    });

    it('should run optimization phase for complex games', async () => {
      const orchestratorMock = new MockLLM(JSON.stringify({
        workflow: 'complex',
        phases: ['design', 'art', 'coding', 'optimize'],
        reasoning: 'Complex game needs optimization',
        estimatedTokens: 20000
      }));

      const pipelinesRun = [];
      sharedState.onStatusUpdate = (type, payload) => {
        if (type === 'PipelineStatus') {
          pipelinesRun.push(payload.phase.name);
        }
      };

      await runModularGameSpecPipeline(sharedState);

      expect(pipelinesRun).toContain('optimize');
    });
  });

  describe('Reflection Loops', () => {
    it('should retry design if playability score < 5', async () => {
      let designAttempts = 0;

      // First attempt: low score
      // Second attempt: high score
      const mockResponses = [
        { score: 3, isPlayable: false, issues: ['Too difficult'] },
        { score: 8, isPlayable: true, issues: [] }
      ];

      sharedState.onStatusUpdate = (type, payload) => {
        if (payload.phase?.name === 'design') {
          designAttempts++;
        }
      };

      await runModularGameSpecPipeline(sharedState);

      expect(designAttempts).toBeGreaterThan(1);
      expect(sharedState.gameDef).toBeTruthy();
    });

    it('should not exceed max reflection attempts', async () => {
      // Mock always returns low scores
      const mockLLM = new MockLLM(JSON.stringify({
        score: 2,
        isPlayable: false,
        issues: ['Fundamentally flawed']
      }));

      let reflectionAttempts = 0;
      sharedState.onStatusUpdate = (type, payload) => {
        if (type === 'Reflection') {
          reflectionAttempts++;
        }
      };

      // Should give up after max attempts
      await runModularGameSpecPipeline(sharedState);

      expect(reflectionAttempts).toBeLessThanOrEqual(3);
    });
  });

  describe('Progress Tracking', () => {
    it('should emit unified progress events across phases', async () => {
      const progressEvents = [];

      sharedState.onStatusUpdate = (type, payload) => {
        if (type === 'PipelineStatus') {
          progressEvents.push(payload.progress);
        }
      };

      await runModularGameSpecPipeline(sharedState);

      // Progress should increase monotonically
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i]).toBeGreaterThanOrEqual(progressEvents[i - 1]);
      }

      // Final progress should be 1.0
      expect(progressEvents[progressEvents.length - 1]).toBe(1.0);
    });

    it('should track token usage across all phases', async () => {
      await runModularGameSpecPipeline(sharedState);

      expect(sharedState.tokenCount).toBeGreaterThan(0);
      expect(sharedState.promptTokens).toBeGreaterThan(0);
      expect(sharedState.completionTokens).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle chain failures gracefully', async () => {
      // Mock chain that throws error
      const errorMock = new MockLLM('invalid json');

      await expect(runModularGameSpecPipeline(sharedState))
        .rejects.toThrow();
    });

    it('should clean up state on failure', async () => {
      const initialTokenCount = sharedState.tokenCount;

      try {
        await runModularGameSpecPipeline(sharedState);
      } catch (err) {
        // Token count should still be updated even on failure
        expect(sharedState.tokenCount).toBeGreaterThanOrEqual(initialTokenCount);
      }
    });
  });
});
```

### 3. E2E Test Generation

Full pipeline tests with real or mock LLMs:

```javascript
// /server/tests/e2e/fullOrchestration.test.js
import { describe, it, expect } from 'vitest';
import { runPipeline } from '../../controller.js';

describe('E2E: Full Orchestrated Pipeline', () => {
  it('should generate complete game with orchestration', async () => {
    const events = [];
    const onStatusUpdate = (type, payload) => {
      events.push({ type, payload });
    };

    const result = await runPipeline(
      'Simple Pong Game',
      onStatusUpdate,
      { mockPipeline: true, minimalGame: false }
    );

    // Verify game was created
    expect(result.game).toBeTruthy();
    expect(result.game.id).toBeTruthy();
    expect(result.game.name).toBeTruthy();

    // Verify pipeline events were emitted
    const pipelineEvents = events.filter(e => e.type === 'PipelineStatus');
    expect(pipelineEvents.length).toBeGreaterThan(0);

    // Verify final progress
    const finalEvent = pipelineEvents[pipelineEvents.length - 1];
    expect(finalEvent.payload.progress).toBe(1.0);
  });

  it('should route different game types through appropriate workflows', async () => {
    const gameTypes = [
      { title: 'Text Adventure', expectedPhases: ['design', 'coding'] },
      { title: 'Platformer Game', expectedPhases: ['design', 'art', 'coding'] },
      { title: 'Complex RPG', expectedPhases: ['design', 'art', 'coding', 'optimize'] }
    ];

    for (const gameType of gameTypes) {
      const phases = [];
      const onStatusUpdate = (type, payload) => {
        if (type === 'PipelineStatus') {
          phases.push(payload.phase.name);
        }
      };

      await runPipeline(gameType.title, onStatusUpdate, { mockPipeline: true });

      // Verify expected phases were executed
      for (const expectedPhase of gameType.expectedPhases) {
        expect(phases).toContain(expectedPhase);
      }
    }
  });
});
```

### 4. LangGraph Workflow Test Generation

Tests for StateGraph conditional routing:

```javascript
// /server/tests/integration/langGraphWorkflow.test.js
import { describe, it, expect } from 'vitest';
import { StateGraph, END } from '@langchain/langgraph';

describe('LangGraph Orchestration Workflow', () => {
  it('should route based on game complexity', async () => {
    // Define test workflow
    const workflow = new StateGraph({
      channels: { complexity: null, phase: null }
    });

    workflow.addNode('start', (state) => ({ ...state, phase: 'start' }));
    workflow.addNode('simple', (state) => ({ ...state, phase: 'simple' }));
    workflow.addNode('complex', (state) => ({ ...state, phase: 'complex' }));

    workflow.addConditionalEdges(
      'start',
      (state) => state.complexity === 'simple' ? 'simple' : 'complex',
      { simple: 'simple', complex: 'complex' }
    );

    workflow.setEntryPoint('start');
    workflow.addEdge('simple', END);
    workflow.addEdge('complex', END);

    const app = workflow.compile();

    // Test simple routing
    const simpleResult = await app.invoke({ complexity: 'simple' });
    expect(simpleResult.phase).toBe('simple');

    // Test complex routing
    const complexResult = await app.invoke({ complexity: 'complex' });
    expect(complexResult.phase).toBe('complex');
  });

  it('should implement reflection loop with max attempts', async () => {
    const workflow = new StateGraph({
      channels: { attempts: null, score: null }
    });

    workflow.addNode('design', (state) => ({
      ...state,
      score: Math.random() * 10,
      attempts: (state.attempts || 0) + 1
    }));

    workflow.addConditionalEdges(
      'design',
      (state) => {
        if (state.score >= 7) return END;
        if (state.attempts >= 3) return END;
        return 'design';
      },
      { design: 'design' }
    );

    workflow.setEntryPoint('design');

    const app = workflow.compile();
    const result = await app.invoke({ attempts: 0, score: 0 });

    expect(result.attempts).toBeLessThanOrEqual(3);
  });
});
```

### 5. Test Coverage Utilities

Helpers for maintaining test quality:

```javascript
// /server/tests/helpers/testUtils.js

/**
 * Creates a mock sharedState with common defaults
 */
export function createMockSharedState(overrides = {}) {
  return {
    tokenCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    gameDef: null,
    plan: [],
    gameSource: '',
    spritePack: { items: {} },
    ...overrides
  };
}

/**
 * Creates a MockLLM with structured output for a specific schema
 */
export function createMockLLMForSchema(schema, data) {
  const validated = schema.parse(data);
  return new MockLLM(JSON.stringify(validated));
}

/**
 * Asserts that progress events are valid
 */
export function assertValidProgressEvents(events) {
  const progressEvents = events.filter(e => e.type === 'PipelineStatus');

  expect(progressEvents.length).toBeGreaterThan(0);

  // Progress should be between 0 and 1
  progressEvents.forEach(e => {
    expect(e.payload.progress).toBeGreaterThanOrEqual(0);
    expect(e.payload.progress).toBeLessThanOrEqual(1);
  });

  // Final progress should be 1.0
  const finalEvent = progressEvents[progressEvents.length - 1];
  expect(finalEvent.payload.progress).toBe(1.0);
}

/**
 * Captures all status events during pipeline execution
 */
export function createEventCapture() {
  const events = [];

  const capture = (type, payload) => {
    events.push({ type, payload, timestamp: Date.now() });
  };

  capture.getEvents = () => events;
  capture.getEventsByType = (type) => events.filter(e => e.type === type);

  return capture;
}
```

### 6. Snapshot Testing for Chains

Test chain outputs remain consistent:

```javascript
// /server/tests/unit/snapshots/chainOutputs.test.js
import { describe, it, expect } from 'vitest';
import { createPlannerChain } from '../../../agents/chains/PlannerChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';

describe('Chain Output Snapshots', () => {
  it('should match expected planner output format', async () => {
    const mockResponse = {
      plan: [
        { id: 1, description: 'Setup canvas and game loop' },
        { id: 2, description: 'Add player entity' },
        { id: 3, description: 'Implement win condition' }
      ]
    };

    const mockLLM = new MockLLM(JSON.stringify(mockResponse));
    const chain = await createPlannerChain(mockLLM, {});

    const result = await chain.invoke({
      gameDefinition: JSON.stringify({ title: 'Test' })
    });

    expect(result).toMatchSnapshot();
  });
});
```

## Test Categories

### Unit Tests (`/server/tests/unit/`)
- Individual chain testing
- Schema validation
- Token tracking
- MockLLM patterns
- Edge cases

### Integration Tests (`/server/tests/integration/`)
- Multi-chain workflows
- Pipeline orchestration
- Conditional routing
- Reflection loops
- Progress tracking

### E2E Tests (`/server/tests/e2e/`)
- Complete game generation
- File system operations
- Different game types
- Error scenarios

## Usage Examples

### Example 1: Generate Tests for New Chain
```
User: "I just created a BalanceCheckerChain, generate tests for it"

Claude:
1. Analyzes chain schema and inputs
2. Generates unit tests with MockLLM
3. Creates test cases for:
   - Valid balance detection
   - Imbalance detection with issues
   - Token tracking
   - Schema validation
   - Edge cases (empty gameDef, null values)
4. Adds integration test for balance check in pipeline
```

### Example 2: Generate Orchestration Tests
```
User: "Generate tests for the new orchestrator conditional routing"

Claude:
1. Creates integration tests for workflow decisions
2. Tests all routing paths (simple, standard, complex)
3. Verifies phases are skipped/included correctly
4. Tests reflection loops with quality thresholds
5. Validates progress events across conditional branches
```

### Example 3: Add Coverage for Edge Cases
```
User: "Add edge case tests for the art pipeline"

Claude:
1. Tests empty entities array
2. Tests missing sprite descriptions
3. Tests sprite cache hits/misses
4. Tests DSL compilation failures
5. Tests pack persistence errors
```

## Best Practices

### Test Organization
```
tests/
├── unit/                 # Fast, isolated tests
│   ├── chains/
│   ├── utils/
│   └── schemas/
├── integration/          # Multi-component tests
│   ├── pipelines/
│   ├── orchestration/
│   └── workflows/
├── e2e/                  # Full system tests
├── helpers/              # Test utilities
│   ├── MockLLM.js
│   └── testUtils.js
└── fixtures/             # Test data
```

### Naming Conventions
- Test files: `{ComponentName}.test.js`
- Describe blocks: Component or feature name
- It blocks: "should {expected behavior}"
- Use descriptive test names

### MockLLM Patterns
```javascript
// ✅ Good: Explicit mock responses
const mockLLM = new MockLLM(JSON.stringify({
  field1: 'value',
  field2: 123
}));

// ❌ Bad: Generic or unclear mocks
const mockLLM = new MockLLM('{}');
```

### Test Coverage Goals
- Unit tests: 100% of chains
- Integration tests: All pipeline flows
- E2E tests: Major user workflows
- Edge cases: All error paths

## Deliverables

When invoked, this skill generates:

1. **Unit Test Suite**
   - Individual chain tests
   - Schema validation tests
   - Token tracking tests
   - Edge case coverage

2. **Integration Test Suite**
   - Pipeline orchestration tests
   - Conditional routing tests
   - Reflection loop tests
   - Progress tracking tests

3. **E2E Test Suite**
   - Complete workflow tests
   - Different game type tests
   - Error scenario tests

4. **Test Utilities**
   - Helper functions
   - Mock factories
   - Event capture utilities
   - Assertion helpers

5. **Test Documentation**
   - Test coverage report
   - Testing guidelines
   - How to run tests
   - How to add new tests

## Questions to Ask User

Before generating tests:
1. What component needs testing? (chain, pipeline, orchestrator)
2. What scenarios should be covered? (happy path, edge cases, errors)
3. Should tests use MockLLM or real LLM?
4. What's the expected behavior?
5. Are there specific edge cases to test?

## Success Metrics

- [ ] All new chains have unit tests
- [ ] All orchestration logic has integration tests
- [ ] Test coverage remains at 100%
- [ ] All tests pass with MockLLM
- [ ] Tests run in < 5 seconds (unit), < 30 seconds (integration)
- [ ] Edge cases are covered
- [ ] Documentation is clear

## Related Skills

- **Agentic Chain Builder**: Creates chains that need tests
- **Agentic Orchestration Analyst**: Designs orchestration that needs tests
- **LangChain Migration Expert**: Migration requires test updates

## Commands

This skill responds to:
- "generate tests for {component}"
- "add test coverage for {feature}"
- "create unit tests"
- "write integration tests"
- "test the orchestrator"
- "add edge case tests"

---

**Note**: This skill focuses on TEST generation. For creating the components being tested, use "Agentic Chain Builder" or "Agentic Orchestration Analyst".
