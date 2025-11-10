# Prompt Engineering Workshop

A specialized skill for optimizing LLM prompts in AtariFactory chains to improve output quality, reduce token usage, increase consistency, and enhance orchestrator decision-making.

## Purpose

Analyze and improve prompt templates for all LangChain chains, apply prompt engineering best practices (few-shot learning, chain-of-thought, constraints), optimize for structured outputs with Zod schemas, and ensure prompts align with orchestration goals.

## When to Invoke

- When chain outputs are inconsistent or low quality
- When adding new chains that need prompt templates
- When the user mentions "improve prompt", "optimize prompt", "better results"
- When orchestrator makes poor workflow decisions
- When token usage is too high
- When structured outputs don't match schemas
- Before major releases or architecture changes
- When debugging chain failures

## Core Capabilities

### 1. Prompt Analysis & Optimization

Analyzes existing prompts for improvement opportunities:

#### **Before (Basic Prompt)**
```markdown
# PlannerChain Prompt

You are a game planner. Create a plan for implementing this game.

Game Definition:
{gameDefinition}

Output a plan with steps.
```

**Issues:**
- Vague instructions
- No output format specification
- No constraints
- No examples
- Missing context about game engine

#### **After (Optimized Prompt)**
```markdown
# PlannerChain Prompt

You are an expert game development planner specializing in HTML5 canvas games.

## Your Task
Create a detailed, step-by-step implementation plan for building the following game using vanilla JavaScript and HTML5 Canvas API.

## Game Definition
{gameDefinition}

## Game Engine Constraints
- Canvas size: 800x600px (responsive)
- Pure JavaScript (no frameworks)
- Entity-based architecture
- Sprite-based rendering
- Keyboard and touch controls supported
- 60 FPS target frame rate

## Plan Requirements
Each step should:
1. Be atomic and testable
2. Build on previous steps
3. Focus on ONE specific feature
4. Include clear acceptance criteria
5. Be implementable in 50-100 lines of code

## Step Order
Follow this general sequence:
1. Setup (canvas, game loop, state management)
2. Core entities (player, enemies, items)
3. Game mechanics (movement, collision, scoring)
4. Win/lose conditions
5. UI elements (score display, game over screen)

## Output Format
Return a JSON array of step objects:
```json
[
  {
    "id": 1,
    "description": "Set up HTML canvas and initialize game loop with requestAnimationFrame",
    "dependencies": [],
    "estimatedLines": 30
  },
  {
    "id": 2,
    "description": "Create Player class with position, velocity, and render method",
    "dependencies": [1],
    "estimatedLines": 50
  }
]
```

## Quality Criteria
- Plan should have 5-12 steps (not too granular, not too broad)
- Each step should be independently testable
- Steps should flow logically (no forward dependencies)
- Complex features should be broken into sub-steps

## Examples

### Example 1: Platformer Game
Input: "Create a platformer where player jumps on platforms and collects coins"
Output:
```json
[
  { "id": 1, "description": "Setup canvas, game loop, and keyboard input handlers" },
  { "id": 2, "description": "Create Player entity with position, gravity, and render method" },
  { "id": 3, "description": "Implement horizontal movement (left/right keys)" },
  { "id": 4, "description": "Implement jump mechanics with gravity and ground collision" },
  { "id": 5, "description": "Create Platform class and place static platforms" },
  { "id": 6, "description": "Implement player-platform collision detection and landing" },
  { "id": 7, "description": "Add collectible coins with player-coin collision" },
  { "id": 8, "description": "Implement score tracking and display" },
  { "id": 9, "description": "Add win condition (collect all coins)" }
]
```

### Example 2: Shooter Game
Input: "Create a space shooter where player shoots enemies"
Output:
```json
[
  { "id": 1, "description": "Setup canvas, game loop, and input handlers" },
  { "id": 2, "description": "Create Player spaceship with horizontal movement" },
  { "id": 3, "description": "Implement bullet firing on spacebar press" },
  { "id": 4, "description": "Create Bullet class with upward velocity" },
  { "id": 5, "description": "Create Enemy class with downward movement pattern" },
  { "id": 6, "description": "Implement enemy spawning system" },
  { "id": 7, "description": "Add bullet-enemy collision detection" },
  { "id": 8, "description": "Implement score system and enemy destruction" },
  { "id": 9, "description": "Add player-enemy collision for game over" },
  { "id": 10, "description": "Display score and game over screen" }
]
```

## Constraints
- DO NOT create steps that require external libraries
- DO NOT assume the existence of helper functions not in the game engine
- DO NOT create overly complex steps (keep each under 100 lines)
- DO use standard Canvas API methods
- DO follow entity-component patterns where appropriate

---

Now, create a detailed implementation plan for the provided game definition above.
```

**Improvements:**
- Clear role definition ("expert game development planner")
- Explicit task description
- Detailed constraints (canvas size, no frameworks, etc.)
- Output format specification with JSON schema
- Two complete examples (few-shot learning)
- Quality criteria
- Explicit "DO/DO NOT" constraints
- Better structured with sections

### 2. Few-Shot Learning

Add examples to improve consistency:

```markdown
## Examples

### Example 1: {scenario_1}
Input: {input_1}
Expected Output: {output_1}

### Example 2: {scenario_2}
Input: {input_2}
Expected Output: {output_2}

### Example 3: {scenario_3}
Input: {input_3}
Expected Output: {output_3}

---

Now process the following input following the pattern above:
{actual_input}
```

**When to use:**
- Complex output formats
- Nuanced decision-making
- Domain-specific terminology
- Consistent style/tone

### 3. Chain-of-Thought Prompting

Improve reasoning quality for orchestrator:

#### **Before (Direct Decision)**
```markdown
# OrchestratorChain Prompt

Decide the workflow for this game: {title}

Output: simple, standard, or complex
```

#### **After (Chain-of-Thought)**
```markdown
# OrchestratorChain Prompt

Analyze the following game idea and decide the optimal workflow.

Game Title: {title}

## Step 1: Analyze Game Complexity
Think through these questions:
- How many entities are involved?
- Does it require visual sprites or is it text-based?
- Are the mechanics simple or complex?
- Does it need physics/collision detection?
- Is there multiplayer or AI?

Write your analysis:
[Reasoning space]

## Step 2: Estimate Resource Requirements
Based on your analysis:
- Estimated tokens for design phase: X
- Will art generation be needed? Yes/No
- Will optimization be needed? Yes/No
- Estimated total tokens: X

Write your reasoning:
[Reasoning space]

## Step 3: Select Workflow
Based on steps 1-2, choose:
- **simple**: Text-based or minimal entities, skip art, fast track
- **standard**: Normal game with entities, full pipeline
- **complex**: Many entities/mechanics, needs optimization and polish

## Step 4: Output Decision
```json
{
  "workflow": "simple|standard|complex",
  "phases": ["design", "art", "coding", "optimize", "polish"],
  "reasoning": "Based on analysis above...",
  "estimatedTokens": 15000
}
```

Think step-by-step and show your reasoning.
```

**Benefits:**
- More transparent decisions
- Better reasoning quality
- Easier to debug failures
- Can trace decision path

### 4. Schema-Aligned Prompts

Ensure prompts match Zod schemas exactly:

```javascript
// Schema
export const balanceCheckerSchema = z.object({
  isBalanced: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  reasoning: z.string().min(1)
});
```

```markdown
# Prompt (aligned with schema)

## Output Format
Return a JSON object with EXACTLY these fields:

```json
{
  "isBalanced": true,           // boolean: true if game is well-balanced
  "score": 8,                   // number: 0-10 balance score
  "issues": [                   // array of strings (optional): problems found
    "Enemy spawn rate too high"
  ],
  "suggestions": [              // array of strings (optional): improvements
    "Reduce spawn rate by 30%"
  ],
  "reasoning": "..."            // string: detailed explanation (required)
}
```

IMPORTANT:
- `isBalanced` and `score` are REQUIRED
- `issues` and `suggestions` are OPTIONAL (omit if empty)
- `reasoning` is REQUIRED and must be at least one sentence
- Do not add extra fields not shown above
```

### 5. Constraint Engineering

Add explicit constraints to prevent errors:

```markdown
## Constraints

### MUST DO
- Return valid JSON matching the schema exactly
- Include all required fields
- Use specific, actionable language
- Stay within token limits

### MUST NOT DO
- Include markdown code fences (```) in output
- Add fields not in the schema
- Return null for required fields
- Make assumptions about unavailable data
- Invent entities not in the game definition

### Format Requirements
- Numbers: Use integers where appropriate
- Booleans: true/false (lowercase, no quotes)
- Strings: Use double quotes
- Arrays: Use square brackets, comma-separated
- Objects: Use curly braces

### Content Requirements
- Be specific (not "fix the issue" but "reduce spawn rate by 30%")
- Be actionable (provide concrete steps)
- Be realistic (don't suggest impossible features)
- Be consistent with game definition provided
```

### 6. Token Optimization

Reduce prompt length without losing quality:

#### **Before (Verbose)**
```markdown
You are a highly experienced and knowledgeable game design expert with extensive experience in game balance, player psychology, difficulty curves, and game feel. You have worked on numerous successful games across many genres and platforms. Your expertise includes analyzing game mechanics, identifying balance issues, and suggesting improvements that enhance player experience while maintaining engagement and challenge.

Your task is to carefully and thoroughly analyze the provided game definition in great detail. You should examine every aspect of the game mechanics, entity behaviors, win conditions, and player interactions. Look for any potential balance issues, exploits, or problems that could negatively impact the player experience. Consider the difficulty curve and whether it's appropriate for the target audience.
```

#### **After (Concise)**
```markdown
You are a game balance expert. Analyze the game definition below for balance issues and suggest improvements.

Focus on:
- Difficulty curve
- Entity balance
- Exploitable mechanics
- Win condition fairness
```

**Token savings: ~75% reduction**

**Rules for conciseness:**
- Remove filler words
- Use bullet points
- Combine redundant instructions
- Keep only essential context

### 7. Prompt Templates by Category

#### **Design Chains**
```markdown
Template:
- Role: Game design expert
- Context: HTML5 canvas game constraints
- Task: Specific design task
- Output: Structured format with schema
- Examples: 2-3 relevant examples
- Constraints: Technical limitations
```

#### **Validation Chains**
```markdown
Template:
- Role: Quality assurance expert
- Input: What to validate
- Criteria: Specific validation rules
- Output: Pass/fail + issues + suggestions
- Be strict and specific
```

#### **Coding Chains**
```markdown
Template:
- Role: Senior JavaScript developer
- Context: Existing codebase structure
- Task: Specific implementation
- Code style: Conventions to follow
- Output: Clean, commented code
- Constraints: No external libraries
```

#### **Orchestration Chains**
```markdown
Template:
- Role: Meta-orchestrator
- Task: Workflow decision
- Analysis steps: Chain-of-thought
- Decision criteria: Explicit rules
- Output: Workflow + reasoning
```

### 8. Prompt Testing & Validation

Generate test cases for prompts:

```javascript
// Test different inputs with same prompt
const testCases = [
  { input: 'simple text game', expected: { workflow: 'simple' } },
  { input: 'complex multiplayer', expected: { workflow: 'complex' } },
  { input: 'standard platformer', expected: { workflow: 'standard' } }
];

for (const testCase of testCases) {
  const result = await chain.invoke(testCase.input);
  expect(result.workflow).toBe(testCase.expected.workflow);
}
```

## Prompt Engineering Patterns

### Pattern 1: Role-Context-Task-Format
```markdown
# [Role]
You are a {specific expert role}.

# [Context]
You are working on {specific context and constraints}.

# [Task]
Your task is to {specific, actionable task}.

# [Format]
Output the result in this exact format:
{detailed format specification}
```

### Pattern 2: Few-Shot with Reasoning
```markdown
# Examples

## Example 1
Input: {input_1}
Reasoning: {step-by-step reasoning}
Output: {output_1}

## Example 2
Input: {input_2}
Reasoning: {step-by-step reasoning}
Output: {output_2}

# Your Turn
Input: {actual_input}
Reasoning: [think step-by-step]
Output: [your answer]
```

### Pattern 3: Layered Constraints
```markdown
# Task
{Main task description}

# Requirements (MUST HAVE)
- Requirement 1
- Requirement 2

# Constraints (MUST NOT)
- Constraint 1
- Constraint 2

# Quality Criteria (SHOULD HAVE)
- Criterion 1
- Criterion 2
```

## Usage Examples

### Example 1: Optimize Existing Prompt
```
User: "The planner chain is creating too many steps, optimize the prompt"

Claude:
1. Analyzes current PlannerChain.prompt.md
2. Identifies issue: no upper bound on step count
3. Adds constraint: "Create 5-12 steps (optimal range)"
4. Adds quality criteria: "Each step should be 50-100 lines"
5. Adds negative examples: "Too granular" vs "Too broad"
6. Tests with various game types
7. Measures improvement in step count consistency
```

### Example 2: Add Few-Shot Examples
```
User: "Add examples to the orchestrator prompt"

Claude:
1. Identifies scenarios: simple, standard, complex games
2. Creates 3 complete examples with:
   - Game description
   - Analysis reasoning
   - Workflow decision
   - Token estimate
3. Updates prompt template
4. Tests with new games
5. Measures decision consistency improvement
```

### Example 3: Reduce Token Usage
```
User: "The background code prompt is too long, optimize it"

Claude:
1. Measures current prompt token count
2. Identifies verbose sections
3. Removes filler words and redundancy
4. Combines related instructions
5. Keeps essential constraints
6. Tests output quality remains same
7. Reports token savings (e.g., 40% reduction)
```

## Deliverables

When invoked, this skill provides:

1. **Prompt Analysis Report**
   - Current prompt evaluation
   - Issues identified
   - Improvement opportunities
   - Token usage analysis

2. **Optimized Prompts**
   - Rewritten prompt templates
   - Schema-aligned output formats
   - Few-shot examples
   - Explicit constraints

3. **A/B Test Plan**
   - Test cases for comparison
   - Metrics to measure (consistency, quality, token usage)
   - Expected improvements

4. **Prompt Testing Suite**
   - Test cases covering edge cases
   - Validation for schema compliance
   - Consistency checks

5. **Best Practices Guide**
   - Prompt engineering patterns
   - When to use few-shot vs chain-of-thought
   - Token optimization tips
   - Schema alignment checklist

## Questions to Ask User

Before optimizing prompts:
1. Which chain's prompt needs improvement?
2. What specific issue? (quality, consistency, tokens, failures)
3. Do you want few-shot examples added?
4. Should we optimize for token usage or quality?
5. Are there specific edge cases to handle?

## Success Metrics

- [ ] Output quality improved (subjective assessment)
- [ ] Output consistency improved (less variance across runs)
- [ ] Token usage reduced (measure before/after)
- [ ] Schema compliance 100% (no validation errors)
- [ ] Chain failures reduced
- [ ] Orchestrator decisions more accurate
- [ ] A/B test shows measurable improvement

## Common Prompt Issues

### Issue 1: Inconsistent Outputs
**Cause:** Vague instructions, no examples
**Fix:** Add few-shot examples, explicit format specification

### Issue 2: Schema Validation Failures
**Cause:** Prompt doesn't match schema
**Fix:** Include exact JSON schema in prompt, show examples

### Issue 3: High Token Usage
**Cause:** Verbose, repetitive prompts
**Fix:** Remove filler, use bullet points, combine instructions

### Issue 4: Poor Orchestrator Decisions
**Cause:** No reasoning steps, unclear criteria
**Fix:** Add chain-of-thought, explicit decision rules

### Issue 5: Hallucinated Entities
**Cause:** No constraint against inventing data
**Fix:** Add explicit "DO NOT invent" constraints

## Related Skills

- **Agentic Chain Builder**: Creates chains that need prompts
- **Test Suite Generator**: Tests prompt effectiveness
- **LangChain Migration Expert**: Updates prompts for new patterns

## Commands

This skill responds to:
- "optimize prompt for {chain}"
- "improve {chain} prompt"
- "add examples to prompt"
- "reduce token usage in prompt"
- "fix prompt for better results"
- "debug {chain} prompt failures"

---

**Note**: This skill focuses on PROMPT optimization. For creating new chains, use "Agentic Chain Builder". For testing prompts, use "Test Suite Generator".
