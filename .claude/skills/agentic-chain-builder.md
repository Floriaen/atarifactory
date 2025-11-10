# Agentic Chain Builder

A specialized skill for creating new LangChain chains following AtariFactory's standardized patterns and best practices.

## Purpose

Streamline the creation of new LangChain chains by automating boilerplate generation, ensuring consistency with the `chainFactory.js` pattern, and automatically generating corresponding tests, schemas, and prompts.

## When to Invoke

- When the user wants to add a new chain to the pipeline
- When extending functionality with new AI capabilities
- When the user mentions "create a new chain", "add a validator", "new design step"
- When implementing orchestrator-suggested enhancements
- When refactoring existing code into a proper chain

## Core Capabilities

### 1. Chain Generation

Creates a complete chain implementation following AtariFactory patterns:

#### **Files Generated:**
```
/server/agents/chains/{category}/{ChainName}Chain.js
/server/agents/prompts/{category}/{ChainName}Chain.prompt.md
/server/schemas/langchain-schemas.js (adds new schema)
/server/tests/unit/{category}/{ChainName}Chain.test.js
```

#### **Standard Chain Template:**
```javascript
// Example: BalanceCheckerChain.js
import { createStandardChain } from '../../utils/chainFactory.js';
import { balanceCheckerSchema } from '../../schemas/langchain-schemas.js';

/**
 * BalanceCheckerChain: Analyzes game balance and difficulty
 * @param {Object} llm - LangChain LLM instance
 * @param {Object} sharedState - Pipeline shared state
 * @returns {Promise<Runnable>} Configured chain
 */
export async function createBalanceCheckerChain(llm, sharedState = {}) {
  return await createStandardChain({
    chainName: 'BalanceCheckerChain',
    promptFile: 'BalanceCheckerChain.prompt.md',
    inputVariables: ['gameDef', 'difficulty'],
    schema: balanceCheckerSchema,
    preset: 'validation', // or 'creative', 'planning', 'structured'
    llm,
    sharedState
  });
}
```

### 2. Schema Generation

Automatically creates Zod schemas with proper validation:

```javascript
// Added to /server/schemas/langchain-schemas.js
export const balanceCheckerSchema = z.object({
  isBalanced: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  reasoning: z.string().min(1)
});
```

**Features:**
- Type-safe validation
- Optional fields for flexibility
- Min/max constraints where appropriate
- Nested objects for complex outputs
- Array validation with item schemas

### 3. Prompt Template Generation

Creates optimized prompt templates in `/server/agents/prompts/`:

```markdown
# BalanceCheckerChain Prompt

You are a game design expert analyzing game balance and difficulty.

## Your Task
Analyze the provided game definition and evaluate whether it's balanced and fair.

## Game Definition
{gameDef}

## Target Difficulty
{difficulty}

## Analysis Criteria
- Is the game too easy or too hard?
- Are there exploitable mechanics?
- Is the difficulty curve appropriate?
- Are win conditions achievable but challenging?

## Output Format
Provide your analysis in the following JSON structure:
- isBalanced: true if the game is well-balanced
- score: 0-10 score (10 = perfectly balanced)
- issues: List of balance problems (if any)
- suggestions: Recommendations for improvement
- reasoning: Detailed explanation of your assessment

Be specific and actionable in your feedback.
```

**Prompt Best Practices:**
- Clear role definition
- Explicit task description
- Input variable placeholders
- Output format specification
- Few-shot examples for complex tasks
- Constraints and guidelines

### 4. Test Generation

Automatically generates unit tests with MockLLM:

```javascript
// /server/tests/unit/validation/BalanceCheckerChain.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createBalanceCheckerChain } from '../../../agents/chains/validation/BalanceCheckerChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';

describe('BalanceCheckerChain', () => {
  let mockLLM;
  let sharedState;

  beforeEach(() => {
    sharedState = {
      tokenCount: 0,
      promptTokens: 0,
      completionTokens: 0
    };
  });

  it('should analyze game balance correctly', async () => {
    const mockResponse = {
      isBalanced: true,
      score: 8,
      issues: [],
      suggestions: ['Consider adding power-ups'],
      reasoning: 'Game has good difficulty progression'
    };

    mockLLM = new MockLLM(JSON.stringify(mockResponse));
    const chain = await createBalanceCheckerChain(mockLLM, sharedState);

    const result = await chain.invoke({
      gameDef: JSON.stringify({ /* game def */ }),
      difficulty: 'medium'
    });

    expect(result.isBalanced).toBe(true);
    expect(result.score).toBe(8);
    expect(result.reasoning).toBeTruthy();
  });

  it('should detect balance issues', async () => {
    const mockResponse = {
      isBalanced: false,
      score: 3,
      issues: ['Enemy spawn rate too high', 'Player too slow'],
      suggestions: ['Reduce spawn rate by 50%', 'Increase player speed'],
      reasoning: 'Game is too difficult for target audience'
    };

    mockLLM = new MockLLM(JSON.stringify(mockResponse));
    const chain = await createBalanceCheckerChain(mockLLM, sharedState);

    const result = await chain.invoke({
      gameDef: JSON.stringify({ /* game def */ }),
      difficulty: 'easy'
    });

    expect(result.isBalanced).toBe(false);
    expect(result.issues).toHaveLength(2);
  });

  it('should track token usage', async () => {
    mockLLM = new MockLLM(JSON.stringify({
      isBalanced: true,
      score: 7,
      reasoning: 'Acceptable balance'
    }));

    const chain = await createBalanceCheckerChain(mockLLM, sharedState);
    await chain.invoke({ gameDef: '{}', difficulty: 'medium' });

    expect(sharedState.tokenCount).toBeGreaterThan(0);
  });
});
```

### 5. Chain Categories

Organizes chains by purpose:

- **`design/`**: Game design and planning chains
  - IdeaGenerator, LoopClarifier, MechanicExtractor, etc.

- **`validation/`**: Quality assurance chains
  - PlayabilityValidator, BalanceChecker, StaticChecker, etc.

- **`coding/`**: Code generation chains
  - IncrementalCoding, BackgroundCode, ControlBarTransformer, etc.

- **`art/`**: Asset generation chains
  - SpriteMaskGenerator, BackgroundArt, etc.

- **`optimization/`**: Enhancement chains
  - CodeOptimizer, PerformanceAnalyzer, etc.

- **`orchestration/`**: Meta-agents and coordinators
  - TaskRouter, DecisionMaker, ReflectionAgent, etc.

### 6. Chain Presets

Select appropriate preset from `chainFactory.js`:

```javascript
// Presets defined in /server/config/langchain.config.js
const PRESETS = {
  creative: { temperature: 0.9, model: 'gpt-4o-mini' },
  planning: { temperature: 0.3, model: 'gpt-4o' },
  validation: { temperature: 0, model: 'gpt-4o' },
  structured: { temperature: 0.2, model: 'gpt-4o' }
};
```

**Usage Guidelines:**
- `creative`: For idea generation, brainstorming, art descriptions
- `planning`: For structured planning and organization
- `validation`: For strict validation and checking
- `structured`: For code generation and precise outputs

### 7. Integration with Pipeline

Helps integrate new chains into existing pipelines:

```javascript
// Example: Adding BalanceChecker to planning pipeline
// /server/agents/pipeline/planningPipeline.js

import { createBalanceCheckerChain } from '../chains/validation/BalanceCheckerChain.js';

export async function runPlanningPipeline(sharedState, llm, progressTracker) {
  // ... existing chains ...

  // Add balance checking
  progressTracker.logStep('Checking game balance...');
  const balanceChecker = await createBalanceCheckerChain(llm, sharedState);
  const balanceResult = await balanceChecker.invoke({
    gameDef: JSON.stringify(sharedState.gameDef),
    difficulty: sharedState.settings?.difficulty || 'medium'
  });

  sharedState.balanceScore = balanceResult.score;

  if (!balanceResult.isBalanced) {
    progressTracker.logStep('Applying balance improvements...');
    // Trigger auto-fix chain or notify orchestrator
  }

  return sharedState;
}
```

## Usage Examples

### Example 1: Create Validation Chain
```
User: "Create a chain that validates if a game has too many entities"

Claude:
1. Generates EntityCountValidatorChain.js in /server/agents/chains/validation/
2. Creates entityCountValidatorSchema with maxEntities, warnings
3. Writes prompt template asking LLM to count and validate entities
4. Generates test suite with MockLLM
5. Shows integration example for planning pipeline
```

### Example 2: Create Enhancement Chain
```
User: "I need a chain that suggests accessibility improvements"

Claude:
1. Creates AccessibilityEnhancerChain.js in /server/agents/chains/optimization/
2. Defines schema with colorBlindMode, keyboardNav, screenReader fields
3. Writes prompt about WCAG guidelines and game accessibility
4. Generates tests covering different accessibility scenarios
5. Proposes adding to optional enhancement phase in orchestrator
```

### Example 3: Create Orchestration Chain
```
User: "Create a meta-chain that decides which optimization chains to run"

Claude:
1. Creates OptimizationRouterChain.js in /server/agents/chains/orchestration/
2. Schema includes selectedOptimizers array and reasoning
3. Prompt asks LLM to analyze game and select relevant optimizers
4. Tests cover different game types routing to different optimizers
5. Integrates as conditional routing in pipeline
```

## Chain Creation Workflow

1. **Understand Requirements**
   - What does the chain do?
   - What inputs does it need?
   - What output structure is required?
   - Which preset is appropriate?

2. **Generate Schema**
   - Define Zod schema with proper types
   - Add validation constraints
   - Consider optional vs required fields

3. **Create Prompt**
   - Write clear, specific instructions
   - Include input variable placeholders
   - Specify exact output format
   - Add examples if complex

4. **Implement Chain**
   - Use `createStandardChain()` or `createChatChain()`
   - Select appropriate preset
   - Ensure token counting callback is configured
   - Add JSDoc documentation

5. **Generate Tests**
   - Happy path test
   - Edge cases
   - Token tracking validation
   - Schema validation

6. **Integration Guidance**
   - Where to add in pipeline?
   - What triggers the chain?
   - How to handle failures?
   - Progress tracking updates

## Best Practices

### Schema Design
- ✅ Use descriptive field names
- ✅ Add min/max constraints for numbers
- ✅ Use enums for limited options
- ✅ Make fields optional if truly optional
- ✅ Provide default values where sensible
- ❌ Don't make everything required
- ❌ Don't use overly complex nested structures

### Prompt Engineering
- ✅ Be explicit about task and constraints
- ✅ Specify output format clearly
- ✅ Include examples for complex tasks
- ✅ Use few-shot learning when needed
- ✅ Set clear boundaries (e.g., "Do not invent entities")
- ❌ Don't assume LLM knows context
- ❌ Don't use vague instructions

### Testing
- ✅ Test happy path
- ✅ Test edge cases
- ✅ Test schema validation
- ✅ Test token counting
- ✅ Use meaningful mock responses
- ❌ Don't skip tests
- ❌ Don't test only happy path

### Integration
- ✅ Update progress tracker
- ✅ Handle chain failures gracefully
- ✅ Log important events
- ✅ Update sharedState correctly
- ❌ Don't break existing pipeline
- ❌ Don't skip error handling

## Deliverables

When invoked, this skill provides:

1. **Complete Chain Implementation**
   - Chain file with proper factory usage
   - Exported creation function
   - JSDoc documentation

2. **Zod Schema**
   - Added to `/server/schemas/langchain-schemas.js`
   - Properly typed and validated
   - Exported for use

3. **Prompt Template**
   - Clear, optimized prompt in `/server/agents/prompts/`
   - Input variables properly marked
   - Output format specified

4. **Test Suite**
   - Unit tests with MockLLM
   - Multiple test cases
   - Token tracking validation

5. **Integration Guide**
   - Where to add in pipeline
   - Example code for integration
   - Error handling recommendations

## Questions to Ask User

Before generating chain:
1. What is the chain's purpose? (1-2 sentences)
2. What inputs does it need from sharedState?
3. What should it output?
4. Which category? (design, validation, coding, art, optimization, orchestration)
5. Which preset? (creative, planning, validation, structured)
6. Is it required or optional in the pipeline?

## Success Metrics

- [ ] Chain follows chainFactory.js pattern
- [ ] Schema validates expected outputs
- [ ] Prompt is clear and specific
- [ ] Tests pass with MockLLM
- [ ] Token counting works correctly
- [ ] Integrates smoothly with existing pipeline
- [ ] Documentation is complete

## Related Skills

- **Pipeline Architect**: For adding new pipeline phases
- **Test Suite Generator**: For comprehensive test coverage
- **Prompt Engineering Workshop**: For optimizing prompts
- **Schema Validator**: For schema improvements

## Commands

This skill responds to:
- "create a new chain"
- "add a {type} chain"
- "generate chain for {purpose}"
- "build {name} chain"
- "implement {functionality} as a chain"

---

**Note**: This skill focuses on creating individual chains. For orchestration layer, use "Agentic Orchestration Analyst". For batch chain migration, use "LangChain Migration Expert".
