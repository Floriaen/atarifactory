# LangChain Migration Expert

A specialized skill for migrating AtariFactory to modern LangChain patterns (v0.3+), LangGraph StateGraph workflows, and LCEL (LangChain Expression Language) for optimal agentic orchestration.

## Purpose

Guide and implement migrations from sequential chain pipelines to state-based orchestration using LangGraph, ensure compatibility with latest LangChain patterns, optimize for LangChain v0.3+ features, and maintain backward compatibility during transitions.

## When to Invoke

- When migrating from sequential pipelines to LangGraph StateGraph
- When upgrading LangChain version (currently v0.3+)
- When implementing conditional routing or reflection loops
- When optimizing chain composition with LCEL
- When the user mentions "LangGraph", "StateGraph", "LCEL", "migration"
- When adding autonomous decision-making to pipelines
- When implementing multi-agent collaboration patterns

## Core Capabilities

### 1. LangGraph StateGraph Migration

Transform sequential pipelines into state-based workflows:

#### **Before (Sequential Pipeline)**
```javascript
// /server/agents/pipeline/pipeline.js
async function runModularGameSpecPipeline(sharedState) {
  await runPlanningPipeline(sharedState, orchestratorOnStatusUpdate);
  await runArtPipeline(sharedState, orchestratorOnStatusUpdate);
  await runCodingPipeline(sharedState, orchestratorOnStatusUpdate);
  return sharedState;
}
```

#### **After (LangGraph StateGraph)**
```javascript
import { StateGraph, END } from '@langchain/langgraph';
import { orchestratorSchema } from '../schemas/langchain-schemas.js';

async function createGamePipelineGraph(llm) {
  // Define state schema
  const graphState = {
    channels: {
      title: { value: null },
      complexity: { value: null },
      gameDef: { value: null },
      plan: { value: null },
      spritePack: { value: null },
      gameSource: { value: null },
      qualityScore: { value: 0 },
      reflectionAttempts: { value: 0 },
      tokenCount: { value: 0 }
    }
  };

  const workflow = new StateGraph(graphState);

  // Add agent nodes
  workflow.addNode('orchestrator', async (state) => {
    const chain = await createOrchestratorChain(llm);
    const decision = await chain.invoke({
      title: state.title,
      complexity: state.complexity || 'auto'
    });
    return { ...state, workflowPlan: decision };
  });

  workflow.addNode('planning', async (state) => {
    await runPlanningPipeline(state);
    return state;
  });

  workflow.addNode('art', async (state) => {
    await runArtPipeline(state);
    return state;
  });

  workflow.addNode('coding', async (state) => {
    await runCodingPipeline(state);
    return state;
  });

  workflow.addNode('reflection', async (state) => {
    const reflectionChain = await createReflectionChain(llm);
    const critique = await reflectionChain.invoke({
      gameSource: state.gameSource,
      gameDef: state.gameDef
    });
    return {
      ...state,
      qualityScore: critique.score,
      reflectionFeedback: critique.feedback,
      reflectionAttempts: state.reflectionAttempts + 1
    };
  });

  workflow.addNode('optimization', async (state) => {
    await runOptimizationPipeline(state);
    return state;
  });

  // Define conditional routing
  workflow.setEntryPoint('orchestrator');

  workflow.addEdge('orchestrator', 'planning');

  workflow.addConditionalEdges(
    'planning',
    (state) => {
      // Orchestrator decides if art is needed
      if (state.workflowPlan?.phases?.includes('art')) {
        return 'art';
      }
      return 'coding';
    },
    {
      art: 'art',
      coding: 'coding'
    }
  );

  workflow.addEdge('art', 'coding');

  workflow.addConditionalEdges(
    'coding',
    (state) => {
      // Check if reflection is needed
      return 'reflection';
    }
  );

  workflow.addConditionalEdges(
    'reflection',
    (state) => {
      // Reflection loop logic
      if (state.qualityScore >= 7) {
        // Quality is good, check if optimization needed
        if (state.workflowPlan?.phases?.includes('optimize')) {
          return 'optimization';
        }
        return END;
      }

      // Quality is low, retry if attempts < 3
      if (state.reflectionAttempts < 3) {
        return 'coding'; // Loop back to coding
      }

      // Give up after 3 attempts
      return END;
    },
    {
      optimization: 'optimization',
      coding: 'coding'
    }
  );

  workflow.addEdge('optimization', END);

  return workflow.compile();
}

// Usage
export async function runModularGameSpecPipeline(sharedState) {
  const llm = getLLM();
  const app = await createGamePipelineGraph(llm);

  const result = await app.invoke({
    title: sharedState.title,
    complexity: 'auto'
  });

  // Merge result back into sharedState
  Object.assign(sharedState, result);
  return sharedState;
}
```

### 2. LCEL (LangChain Expression Language) Optimization

Refactor chain composition using LCEL pipes:

#### **Before (Manual Chain Composition)**
```javascript
export async function createFeedbackChain(llm, sharedState = {}) {
  const promptTemplate = PromptTemplate.fromTemplate(promptText);
  const structuredLLM = llm.withStructuredOutput(feedbackSchema);
  const chain = promptTemplate.pipe(structuredLLM);
  return chain;
}
```

#### **After (LCEL with Runnables)**
```javascript
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';

export async function createFeedbackChain(llm, sharedState = {}) {
  const promptTemplate = PromptTemplate.fromTemplate(promptText);
  const structuredLLM = llm.withStructuredOutput(feedbackSchema);

  // Enhanced with LCEL
  const chain = RunnableSequence.from([
    {
      gameSource: new RunnablePassthrough(),
      gameDef: new RunnablePassthrough(),
      // Add context from sharedState
      previousFeedback: () => sharedState.feedback || 'None'
    },
    promptTemplate,
    structuredLLM,
    // Add post-processing
    (output) => {
      // Update sharedState
      sharedState.feedback = output;
      return output;
    }
  ]);

  return chain;
}
```

### 3. Parallel Chain Execution

Optimize independent chains to run in parallel:

#### **Before (Sequential)**
```javascript
// /server/agents/pipeline/planningPipeline.js
const validator = await createPlayabilityValidatorChain(llm, sharedState);
const validationResult = await validator.invoke({ gameDef });

const heuristic = await createPlayabilityHeuristicChain(llm, sharedState);
const heuristicResult = await heuristic.invoke({ gameDef });
```

#### **After (Parallel with RunnableParallel)**
```javascript
import { RunnableParallel } from '@langchain/core/runnables';

const validator = await createPlayabilityValidatorChain(llm, sharedState);
const heuristic = await createPlayabilityHeuristicChain(llm, sharedState);

// Run both chains in parallel
const parallel = new RunnableParallel({
  validation: validator,
  heuristic: heuristic
});

const results = await parallel.invoke({ gameDef });
// results = { validation: {...}, heuristic: {...} }
```

### 4. StateGraph Checkpointing

Add persistence for resumable workflows:

```javascript
import { MemorySaver } from '@langchain/langgraph';

async function createResumableGamePipeline(llm) {
  const workflow = new StateGraph(graphState);

  // ... add nodes and edges ...

  // Add checkpointing for resume capability
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });

  return app;
}

// Usage: Resume from checkpoint
const config = { configurable: { thread_id: 'game-123' } };
const result = await app.invoke(initialState, config);

// Later: Resume from same thread
const resumedResult = await app.invoke({ ...updates }, config);
```

### 5. Migration Patterns

#### **Pattern 1: Conditional Routing**
```javascript
// Replace hardcoded if/else with conditional edges
workflow.addConditionalEdges(
  'source_node',
  (state) => {
    // Decision logic
    if (state.complexity === 'simple') return 'fast_path';
    if (state.complexity === 'complex') return 'full_path';
    return 'standard_path';
  },
  {
    fast_path: 'fast_node',
    full_path: 'full_node',
    standard_path: 'standard_node'
  }
);
```

#### **Pattern 2: Reflection Loop**
```javascript
workflow.addConditionalEdges(
  'reflection_node',
  (state) => {
    if (state.qualityScore >= 7) return END;
    if (state.attempts < 3) return 'retry_node';
    return END; // Give up
  },
  {
    retry_node: 'retry_node'
  }
);
```

#### **Pattern 3: Parallel Branches**
```javascript
import { RunnableBranch } from '@langchain/core/runnables';

const branch = RunnableBranch.from([
  [
    (state) => state.needsArt,
    artPipeline
  ],
  [
    (state) => state.needsOptimization,
    optimizationPipeline
  ],
  // Default
  defaultPipeline
]);
```

### 6. Streaming Support

Add streaming for real-time updates:

```javascript
async function runStreamingPipeline(sharedState) {
  const app = await createGamePipelineGraph(llm);

  // Stream events
  const stream = await app.stream({
    title: sharedState.title
  });

  for await (const event of stream) {
    console.log('Pipeline event:', event);
    // Emit to frontend
    sharedState.onStatusUpdate?.('StreamEvent', event);
  }
}
```

### 7. Tool Integration for Agents

Convert chains to tools for meta-agents:

```javascript
import { DynamicStructuredTool } from '@langchain/core/tools';

// Convert chain to tool
function chainAsTool(chain, name, description, schema) {
  return new DynamicStructuredTool({
    name,
    description,
    schema,
    func: async (input) => {
      const result = await chain.invoke(input);
      return JSON.stringify(result);
    }
  });
}

// Create tool-using orchestrator
const tools = [
  chainAsTool(plannerChain, 'planner', 'Plans game implementation', plannerInputSchema),
  chainAsTool(validatorChain, 'validator', 'Validates game design', validatorInputSchema),
  chainAsTool(coderChain, 'coder', 'Generates game code', coderInputSchema)
];

const orchestrator = new ChatOpenAI({ model: 'gpt-4' }).bindTools(tools);
```

## Migration Strategies

### Strategy 1: Incremental Migration (Recommended)
1. Keep existing pipeline as fallback
2. Add LangGraph workflow alongside
3. Use feature flag to switch between implementations
4. Gradually migrate phase by phase
5. Remove old implementation once stable

### Strategy 2: Parallel Implementation
1. Create LangGraph version in new file
2. Run both implementations in test environment
3. Compare results for consistency
4. Switch to LangGraph once validated
5. Archive old implementation

### Strategy 3: Wrapper Approach
1. Wrap existing pipelines as LangGraph nodes
2. Add orchestration layer on top
3. Gradually refactor nodes to use LCEL
4. Optimize with parallel execution
5. Replace wrappers with native implementations

## Compatibility Checklist

### LangChain v0.3+ Features
- [ ] Use `.withStructuredOutput()` for Zod schemas
- [ ] Use `RunnableSequence` for chain composition
- [ ] Use `RunnableParallel` for parallel execution
- [ ] Use `StateGraph` for conditional workflows
- [ ] Use token counting callbacks
- [ ] Use streaming where applicable

### Breaking Changes from v0.2
- [ ] Update import paths (`@langchain/core`, `@langchain/openai`)
- [ ] Replace deprecated `LLMChain` with `RunnableSequence`
- [ ] Update callback patterns
- [ ] Migrate to new Runnable interface
- [ ] Update tool calling syntax

### AtariFactory-Specific
- [ ] Maintain `sharedState` flow
- [ ] Preserve token tracking
- [ ] Keep progress tracking
- [ ] Maintain test coverage with MockLLM
- [ ] Ensure backward compatibility with existing API

## Usage Examples

### Example 1: Migrate Sequential Pipeline to LangGraph
```
User: "Migrate the planning pipeline to use LangGraph"

Claude:
1. Analyzes current sequential flow
2. Creates StateGraph with nodes for each step
3. Adds conditional routing based on game complexity
4. Implements reflection loop for playability
5. Adds checkpointing for resume capability
6. Updates tests to cover conditional paths
7. Provides migration guide and rollback plan
```

### Example 2: Add Conditional Routing
```
User: "Add routing to skip art pipeline for text games"

Claude:
1. Adds orchestrator node to decide workflow
2. Creates conditional edge from planning to art/coding
3. Updates schema to include workflow decision
4. Adds tests for both paths (with art, without art)
5. Updates progress tracking for conditional phases
```

### Example 3: Optimize with LCEL
```
User: "Optimize chain composition using LCEL"

Claude:
1. Identifies chains that can run in parallel
2. Refactors using RunnableParallel
3. Adds RunnablePassthrough for context injection
4. Implements RunnableBranch for conditional logic
5. Measures performance improvement
```

## Deliverables

When invoked, this skill provides:

1. **Migration Plan**
   - Step-by-step migration strategy
   - Risk assessment
   - Rollback plan
   - Timeline estimate

2. **LangGraph Implementation**
   - StateGraph workflow definition
   - Node implementations
   - Conditional routing logic
   - Checkpointing setup

3. **LCEL Optimizations**
   - Refactored chain compositions
   - Parallel execution where applicable
   - Streaming support
   - Tool integrations

4. **Updated Tests**
   - Tests for conditional routing
   - Tests for reflection loops
   - Tests for parallel execution
   - Integration tests for StateGraph

5. **Migration Documentation**
   - API changes
   - Breaking changes
   - How to rollback
   - Performance benchmarks

## Questions to Ask User

Before migration:
1. Which pipeline/chain should be migrated first?
2. Full migration or incremental?
3. Should we maintain backward compatibility?
4. What's the rollback strategy?
5. Any specific LangGraph features to prioritize?

## Success Metrics

- [ ] LangGraph workflow successfully replaces sequential pipeline
- [ ] Conditional routing works correctly
- [ ] All tests pass with new implementation
- [ ] Token tracking preserved
- [ ] Progress tracking works across conditional paths
- [ ] Performance equal or better than before
- [ ] Can rollback to old implementation if needed

## Common Migration Issues

### Issue 1: State Management
**Problem:** LangGraph state differs from sharedState
**Solution:** Create adapter layer to sync LangGraph state with sharedState

### Issue 2: Token Tracking
**Problem:** Token callbacks not firing in StateGraph
**Solution:** Ensure callbacks are passed through config to all nodes

### Issue 3: Progress Tracking
**Problem:** Progress calculation breaks with conditional routing
**Solution:** Use dynamic progress weights based on active workflow

### Issue 4: Test Compatibility
**Problem:** MockLLM doesn't work with LangGraph
**Solution:** Create LangGraph-compatible MockLLM wrapper

## Related Skills

- **Agentic Orchestration Analyst**: Designs orchestration that this skill implements
- **Test Suite Generator**: Generates tests for migrated components
- **Agentic Chain Builder**: Creates chains compatible with LangGraph

## Commands

This skill responds to:
- "migrate to LangGraph"
- "add StateGraph workflow"
- "optimize with LCEL"
- "implement conditional routing"
- "add reflection loop"
- "enable parallel execution"
- "upgrade LangChain version"

---

**Note**: This skill focuses on MIGRATION to modern patterns. For designing the orchestration strategy, use "Agentic Orchestration Analyst". For creating new chains, use "Agentic Chain Builder".
