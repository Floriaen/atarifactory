# AI Agent Development Guidelines

## Overview

This document provides essential guidelines for AI agents (like Claude, GPT, etc.) working on the atarifactory codebase. Following these guidelines ensures safe, effective modifications while maintaining system integrity.

## 🚨 Before Making ANY Changes

### **Required Pre-flight Checklist:**
1. ✅ **Read the main README.md** - Understand system overview and restrictions
2. ✅ **Run tests**: `npm test` - Ensure 100% pass rate
3. ✅ **Check file restrictions** - Verify the file you want to modify is safe
4. ✅ **Understand the change scope** - Know what components your change affects

### **Critical Safety Rules:**

#### **🔒 NEVER MODIFY (without explicit user permission):**
- `server/utils/chainFactory.js` - Core chain creation utilities
- `server/schemas/langchain-schemas.js` - Zod validation schemas  
- `server/config/langchain.config.js` - LLM configuration
- `package.json` - Dependencies and scripts
- `vitest.config.js` - Test configuration

#### **⚠️ MODIFY WITH EXTREME CARE:**
- Pipeline orchestration files in `server/agents/pipeline/`
- Test infrastructure in `server/tests/helpers/`
- Chain files in `server/agents/chains/` (individual chains can be modified carefully)

#### **✅ SAFE TO MODIFY (with proper testing):**
- Individual chain implementations when improving specific functionality
- Test files when adding coverage
- Documentation files
- Prompt files in `server/agents/prompts/`

## 🔧 Development Patterns

### **chainFactory Pattern (MANDATORY)**

All chains must use the standardized chainFactory pattern:

```javascript
// CORRECT: Modern chainFactory pattern
import { createStandardChain } from '../../../utils/chainFactory.js';
import { myChainSchema } from '../../../schemas/langchain-schemas.js';

async function createMyChain(llm, options = {}) {
  return await createStandardChain({
    chainName: 'MyChain',
    promptFile: 'MyChain.prompt.md',
    inputVariables: ['input'],
    schema: myChainSchema,
    preset: 'structured',
    llm,
    sharedState: options.sharedState
  });
}
```

> **Naming convention:** Keep prompt filenames aligned with the chain name (`<ChainName>.prompt.md`) and store them under the corresponding domain directory (`design/`, `coding/`, `art/`, etc.).

**❌ NEVER use deprecated patterns:**
- Manual LCEL composition without chainFactory
- Direct LLM calls without structured output
- Legacy `createJsonExtractionChain` (completely removed)

### **Schema-First Development**

Always define Zod schemas for structured output:

```javascript
// In server/schemas/langchain-schemas.js
export const myChainSchema = z.object({
  result: z.string().min(1, 'Result is required'),
  confidence: z.number().min(0).max(1, 'Confidence must be 0-1')
});
```

### **Async Chain Creation**

All chain creation is async and must be awaited:

```javascript
// CORRECT
const chain = await createMyChain(llm, { sharedState });

// WRONG
const chain = createMyChain(llm, { sharedState });
```

## 🧪 Testing Requirements

### **Required Tests for Any Chain Modification:**

1. **Happy Path Test**: Verify expected functionality works
2. **Input Validation Test**: Test missing/invalid inputs
3. **Schema Validation Test**: Test malformed LLM output handling
4. **Token Counting Test**: Verify sharedState token tracking

### **Testing Pattern:**

```javascript
import { MockLLM } from '../../helpers/MockLLM.js';

describe('MyChain', () => {
  it('processes input correctly (happy path)', async () => {
    const mockResponse = { result: 'test', confidence: 0.8 };
    const mockLLM = new MockLLM(mockResponse);
    const chain = await createMyChain(mockLLM);
    
    const result = await chain.invoke({ input: 'test input' });
    expect(result.result).toBe('test');
    expect(result.confidence).toBe(0.8);
  });

  it('throws on invalid input', async () => {
    const chain = await createMyChain(new MockLLM({}));
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('increments token count', async () => {
    const sharedState = { tokenCount: 0 };
    const chain = await createMyChain(new MockLLM({}), { sharedState });
    await chain.invoke({ input: 'test' });
    expect(sharedState.tokenCount).toBeGreaterThan(0);
  });
});
```

## 🔍 Debugging Workflow

### **When Tests Fail:**

1. **Check the error message** - Understand what failed
2. **Verify schema compliance** - Ensure your changes match expected schemas
3. **Check async/await usage** - Common source of chain creation failures
4. **Validate imports** - Ensure correct ESM import paths
5. **Run individual tests** - `npm test -- MyChain.test.js`

### **Common Debugging Commands:**

```bash
# Run specific test file
npm test -- MyChain.test.js

# Run tests with verbose output
npm test -- --reporter=verbose

# Run linting
npm run lint

# Check for import issues
npm run lint -- --fix
```

## 📝 Modification Workflow

### **Step-by-Step Process for Any Change:**

1. **Analyze the requirement** - Understand exactly what needs to change
2. **Identify affected files** - Use `current/reference/codebase-map.md` when available
3. **Check current implementation** - Read the existing code thoroughly
4. **Plan your changes** - Know what you'll modify before starting
5. **Make minimal changes** - Smallest possible change to achieve the goal
6. **Add/update tests** - Ensure your changes are tested
7. **Run verification** - `npm test && npm run lint`
8. **Document significant changes** - Update relevant documentation

### **Change Categories:**

#### **Adding New Chain:**
1. Create Zod schema in `langchain-schemas.js`
2. Create prompt file in `server/agents/prompts/`
3. Implement chain using `createStandardChain()`
4. Add comprehensive tests
5. Update integration if needed

#### **Modifying Existing Chain:**
1. Understand current behavior and tests
2. Modify implementation minimally
3. Update/add tests for new behavior
4. Verify no regressions in existing tests

#### **Bug Fixes:**
1. Create failing test that reproduces the bug
2. Fix the minimal code needed
3. Verify the test now passes
4. Ensure no regressions

## ⚡ Performance Considerations

### **Token Counting:**
- Always pass `sharedState` when provided
- Token counting helps track LLM API costs
- Don't disable or modify token counting logic

### **Chain Efficiency:**
- Use appropriate `preset` for chain type (structured, creative, planning, validation)
- Don't create chains in loops - cache them when possible
- Be mindful of prompt length and complexity

## 🚀 Success Criteria

**Your changes are successful when:**
- [ ] All tests pass (100% success rate)
- [ ] Linting passes without errors
- [ ] No breaking changes to existing functionality
- [ ] New functionality is properly tested
- [ ] Documentation is updated if needed
- [ ] Token counting still works correctly

## 🔄 Recovery Procedures

**If your changes break something:**

1. **Run `git status`** - See what you changed
2. **Run `npm test`** - Identify failing tests
3. **Revert problematic changes** - `git checkout -- <file>`
4. **Start smaller** - Make more incremental changes
5. **Ask for help** - Request clarification from user

**Never:**
- Leave the codebase in a broken state
- Commit failing tests
- Modify core infrastructure without understanding impact
- Skip testing verification steps

---

## 📋 Quick Reference

**Essential Commands:**
- `npm test` - Run all tests
- `npm run lint` - Check code style
- `git status` - See your changes
- `git diff` - Review your modifications

**Key Files to Understand:**
- `README.md` - Main AI agent entry point
- `current/architecture/pipeline-v3-design.md` - System architecture
- `current/development/guidelines/chain-template.md` - Chain implementation template

**When in Doubt:**
- Follow existing patterns in the codebase
- Look at similar implementations for guidance
- Make smaller, incremental changes
- Test thoroughly before finishing

Remember: **Safety first, functionality second, optimization third.**
