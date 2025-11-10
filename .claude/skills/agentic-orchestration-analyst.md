# Agentic Orchestration Analyst

A specialized skill for analyzing and improving multi-agent orchestration patterns in the AtariFactory codebase.

## Purpose

This skill helps identify architectural gaps between sequential chain pipelines and true agentic orchestration, then proposes and implements autonomous agent patterns using LangGraph, CrewAI, or custom orchestration frameworks.

## When to Invoke

- When reviewing overall architecture
- When the user mentions "orchestration", "agent collaboration", or "autonomous agents"
- When planning improvements to the pipeline architecture
- When adding new phases or chains that require dynamic workflow
- When the user wants agents to make decisions about which sub-agents to invoke

## Core Capabilities

### 1. Architecture Audit

Analyze the codebase for:
- **Sequential vs Autonomous**: Identify hardcoded pipelines vs dynamic agent decisions
- **Orchestration Patterns**: Detect missing patterns (Plan-Execute, ReAct, Reflection)
- **Agent Communication**: Evaluate how agents share context and collaborate
- **Decision Making**: Check if any component autonomously decides workflow
- **Failure Recovery**: Assess retry logic and self-correction mechanisms
- **Dynamic Routing**: Identify opportunities for conditional agent invocation

### 2. Gap Analysis

Compare current architecture against true agentic patterns:

**Current State (Sequential Chains):**
- Fixed pipeline: Planning → Art → Coding
- No dynamic decision-making
- Chains don't choose sub-chains
- Linear execution flow
- Hard-coded in pipeline orchestrators

**Ideal State (Agentic Orchestration):**
- Meta-orchestrator agent decides workflow
- Agents autonomously delegate sub-tasks
- Dynamic routing based on game requirements
- Multi-agent collaboration and reflection
- Self-correction loops
- Adaptive pipeline based on intermediate results

### 3. Orchestration Frameworks

Propose and implement patterns using:

#### **LangGraph** (Recommended for LangChain integration)
```javascript
// Example: StateGraph with conditional routing
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph({
  channels: sharedStateSchema
});

workflow.addNode("orchestrator", orchestratorAgent);
workflow.addNode("design", designAgent);
workflow.addNode("validator", validatorAgent);
workflow.addNode("art", artAgent);
workflow.addNode("coding", codingAgent);

workflow.addConditionalEdges(
  "orchestrator",
  (state) => {
    // Orchestrator decides next agent
    if (state.designQuality < 7) return "design";
    if (!state.spritePack) return "art";
    return "coding";
  },
  {
    design: "design",
    art: "art",
    coding: "coding"
  }
);
```

#### **Plan-Execute Pattern**
```javascript
// Meta-agent plans, executor runs sub-agents
const plannerAgent = new PlannerAgent();
const executorAgent = new ExecutorAgent(availableAgents);

const plan = await plannerAgent.plan(userGoal);
for (const step of plan) {
  const agent = executorAgent.selectAgent(step);
  const result = await agent.execute(step);
  if (!result.success) {
    const revisedPlan = await plannerAgent.replan(result);
  }
}
```

#### **ReAct (Reason + Act) Pattern**
```javascript
// Agent reasons about next action, then acts
class OrchestratorAgent {
  async step(state) {
    const thought = await this.reason(state);
    const action = this.selectAction(thought);
    const observation = await this.act(action, state);
    return { thought, action, observation };
  }
}
```

### 4. Implementation Recommendations

#### **For AtariFactory Specifically:**

**Option A: Add Meta-Orchestrator Layer**
- Create `OrchestratorAgent` that decides pipeline flow
- Keep existing chains as "tool" agents
- Orchestrator analyzes game requirements and routes dynamically
- Example: Simple games skip art pipeline, complex games add optimization phase

**Option B: Migrate to LangGraph**
- Convert pipeline to StateGraph
- Add conditional routing based on intermediate results
- Enable parallel agent execution where possible
- Add reflection nodes for quality checks

**Option C: Hybrid Approach** (Recommended)
- Keep stable pipelines (Planning → Art → Coding) for core flow
- Add orchestrator for optional enhancements:
  - Difficulty balancing
  - Code optimization
  - A/B variant generation
  - Post-generation polish

### 5. Key Orchestration Patterns to Implement

#### **Reflection Pattern**
```javascript
// Agent reviews its own output and improves
const output = await codingAgent.generate(plan);
const critique = await reflectionAgent.critique(output);
if (critique.needsImprovement) {
  return await codingAgent.regenerate(output, critique);
}
```

#### **Multi-Agent Debate**
```javascript
// Multiple design agents propose, orchestrator chooses best
const proposals = await Promise.all([
  designAgentA.propose(idea),
  designAgentB.propose(idea),
  designAgentC.propose(idea)
]);
const best = await judgeAgent.selectBest(proposals);
```

#### **Tool-Using Agent**
```javascript
// Orchestrator has access to specialized agents as "tools"
const orchestrator = new ToolCallingAgent({
  tools: [
    designerAgent.asTool(),
    validatorAgent.asTool(),
    coderAgent.asTool()
  ]
});
await orchestrator.run("Create a puzzle game about physics");
```

## Usage Examples

### Example 1: Architecture Audit
```
User: "Analyze the current orchestration architecture"

Claude: [Runs audit]
- Current: Sequential pipeline with fixed flow
- Missing: Meta-orchestrator, dynamic routing, agent collaboration
- Recommendation: Add LangGraph StateGraph with conditional edges
```

### Example 2: Propose Orchestrator
```
User: "Design a meta-orchestrator for the game factory"

Claude: [Designs orchestrator]
- OrchestratorAgent analyzes game idea complexity
- Routes simple games through fast track (skip art generation)
- Routes complex games through full pipeline with optimization
- Adds reflection loop for quality < threshold
```

### Example 3: Implement Pattern
```
User: "Implement Plan-Execute pattern for the coding phase"

Claude: [Implements pattern]
1. Creates PlannerAgent that breaks game into micro-steps
2. Creates ExecutorAgent that selects appropriate coding chains
3. Adds ReplanningAgent for handling failures
4. Integrates with existing IncrementalCodingChain
```

## Deliverables

When this skill is invoked, it produces:

1. **Audit Report**
   - Current architecture analysis
   - Gap identification (sequential vs agentic)
   - Orchestration pattern opportunities

2. **Orchestration Design**
   - Proposed meta-orchestrator architecture
   - Agent collaboration patterns
   - Decision flow diagrams
   - Integration points with existing code

3. **Implementation Plan**
   - Phased rollout strategy
   - Code changes required
   - Testing strategy
   - Backward compatibility approach

4. **Reference Implementation**
   - Working orchestrator prototype
   - LangGraph or custom framework setup
   - Integration with existing chains
   - Tests with MockLLM

## AtariFactory-Specific Context

### Current Architecture
- **Pipeline**: `/server/agents/pipeline/pipeline.js`
- **Chains**: `/server/agents/chains/` (design, art, coding)
- **Factory Pattern**: `/server/utils/chainFactory.js`
- **Shared State**: `/server/types/SharedState.js`
- **Controller**: `/server/controller.js`

### Integration Points
- Orchestrator should use `createStandardChain()` for consistency
- Must update `sharedState` for token tracking
- Should emit progress via `PipelineTracker`
- Must maintain test coverage with MockLLM

### Constraints
- Maintain backward compatibility with existing API
- Keep token counting infrastructure
- Preserve progress tracking (30% / 20% / 50% phases)
- Don't break existing test suite

## Questions to Ask User

Before proposing implementation:
1. What level of autonomy do you want? (Full orchestrator vs hybrid)
2. Which parts of the pipeline should be dynamic vs fixed?
3. Are there specific game types that need different workflows?
4. Should the orchestrator optimize for speed, quality, or token efficiency?
5. Do you want parallel agent execution or sequential with routing?

## Success Metrics

- [ ] Architecture audit reveals all orchestration gaps
- [ ] Proposed orchestrator design is implementable with LangChain/LangGraph
- [ ] Implementation maintains existing test coverage
- [ ] Token tracking and progress updates work with new orchestration
- [ ] Can demonstrate dynamic routing (e.g., simple vs complex game paths)
- [ ] Orchestrator can autonomously decide to invoke optional enhancement agents

## Related Patterns

- **LangGraph**: State machines for agent orchestration
- **CrewAI**: Role-based multi-agent collaboration
- **AutoGen**: Conversational multi-agent framework
- **ReAct**: Reasoning + Acting loop
- **Plan-Execute**: Planning agent + Executor agent
- **Reflection**: Self-critique and improvement loops
- **Hierarchical Planning**: Break tasks into subtasks recursively

## Commands

This skill responds to:
- "audit orchestration"
- "analyze agent architecture"
- "design meta-orchestrator"
- "propose agentic patterns"
- "implement LangGraph workflow"
- "add reflection loop"
- "enable dynamic routing"

---

**Note**: This skill focuses on the *orchestration layer* above individual chains. For creating new chains, use the "Agentic Chain Builder" skill. For prompt optimization, use "Prompt Engineering Workshop".
