# Example: Adding a New Chain to AtariFactory

## Overview

This document provides a complete, step-by-step walkthrough for adding a new chain to the atarifactory system. We'll create a `DifficultyAnalyzerChain` that analyzes game definitions and assigns difficulty ratings.

## 📋 Prerequisites

Before starting:
- ✅ Read `docs/README.md` for system overview
- ✅ Read `current/development/ai-agent-guidelines.md` for development patterns
- ✅ Ensure all tests pass: `npm test`
- ✅ Understand chainFactory patterns

## 🎯 Example Chain: DifficultyAnalyzerChain

**Purpose**: Analyze a game definition and provide a difficulty rating with explanation.

**Input**: Game definition object
**Output**: `{ difficulty: number, explanation: string, recommendations: string[] }`

## Step 1: Define the Zod Schema

**File**: `server/schemas/langchain-schemas.js`

Add the schema to the existing file:

```javascript
// Add this to the existing schemas
export const difficultyAnalyzerSchema = z.object({
  difficulty: z.number()
    .min(1, 'Difficulty must be at least 1')
    .max(10, 'Difficulty must be at most 10')
    .describe('Difficulty rating from 1 (very easy) to 10 (very hard)'),
  explanation: z.string()
    .min(10, 'Explanation must be at least 10 characters')
    .describe('Clear explanation of why this difficulty was assigned'),
  recommendations: z.array(z.string())
    .min(1, 'At least one recommendation is required')
    .describe('Suggestions to adjust difficulty if needed')
});
```

## Step 2: Create the Prompt Template

**File**: `server/agents/prompts/design/difficulty-analyzer.md`

```markdown
You are a game difficulty analysis expert. Analyze the provided game definition and assign an appropriate difficulty rating.

Consider these factors when analyzing difficulty:
- Complexity of mechanics
- Number of simultaneous actions required
- Reaction time demands
- Learning curve
- Cognitive load
- Coordination requirements

Game Definition:
{gameDef}

Analyze this game and provide:
1. A difficulty rating from 1-10 (1 = very easy for beginners, 10 = extremely challenging)
2. A clear explanation of your reasoning
3. Recommendations for adjusting difficulty if needed

Be objective and consider the target audience of casual mobile gamers.
```

## Step 3: Implement the Chain

**File**: `server/agents/chains/design/DifficultyAnalyzerChain.js`

```javascript
import { createStandardChain } from '../../../utils/chainFactory.js';
import { difficultyAnalyzerSchema } from '../../../schemas/langchain-schemas.js';

/**
 * Creates a chain that analyzes game definition complexity and assigns difficulty rating
 * @param {Object} llm - The language model instance
 * @param {Object} options - Configuration options
 * @param {Object} options.sharedState - Shared state for token counting
 * @returns {Promise<Object>} The configured difficulty analyzer chain
 */
async function createDifficultyAnalyzerChain(llm, options = {}) {
  const { sharedState } = options;

  return await createStandardChain({
    chainName: 'DifficultyAnalyzerChain',
    promptFile: 'design/difficulty-analyzer.md',
    inputVariables: ['gameDef'],
    schema: difficultyAnalyzerSchema,
    preset: 'structured', // Use structured preset for analytical tasks
    llm,
    sharedState
  });
}

export { createDifficultyAnalyzerChain };
```

## Step 4: Create Comprehensive Tests

**File**: `server/tests/unit/design/DifficultyAnalyzerChain.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { createDifficultyAnalyzerChain } from '../../../server/agents/chains/design/DifficultyAnalyzerChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('DifficultyAnalyzerChain', () => {
  const sampleGameDef = {
    title: 'Asteroid Dodge',
    description: 'Navigate through asteroid field while collecting power-ups',
    mechanics: ['move', 'dodge', 'collect'],
    winCondition: 'Survive for 60 seconds',
    entities: ['player', 'asteroid', 'power-up']
  };

  describe('Happy Path', () => {
    it('analyzes difficulty correctly', async () => {
      const mockResponse = {
        difficulty: 5,
        explanation: 'Moderate difficulty due to reaction time requirements',
        recommendations: ['Add slow-motion power-up', 'Reduce asteroid density']
      };
      
      const mockLLM = new MockLLM(mockResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      const result = await chain.invoke({ gameDef: sampleGameDef });
      
      expect(result.difficulty).toBe(5);
      expect(result.explanation).toContain('reaction time');
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]).toContain('slow-motion');
    });

    it('handles simple games with low difficulty', async () => {
      const simpleGame = {
        title: 'Click Counter',
        mechanics: ['click'],
        winCondition: 'Click 10 times'
      };

      const mockResponse = {
        difficulty: 2,
        explanation: 'Very simple click-based interaction',
        recommendations: ['Add time pressure', 'Add moving targets']
      };

      const mockLLM = new MockLLM(mockResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      const result = await chain.invoke({ gameDef: simpleGame });
      
      expect(result.difficulty).toBe(2);
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(10);
    });
  });

  describe('Input Validation', () => {
    it('throws if gameDef is missing', async () => {
      const mockLLM = new MockLLM({
        difficulty: 5,
        explanation: 'test',
        recommendations: ['test']
      });
      
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: gameDef');
    });

    it('throws if input is null', async () => {
      const mockLLM = new MockLLM({
        difficulty: 5,
        explanation: 'test',
        recommendations: ['test']
      });
      
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      await expect(chain.invoke(null)).rejects.toThrow('Input must be an object with required fields: gameDef');
    });
  });

  describe('Schema Validation', () => {
    it('throws if difficulty is out of range', async () => {
      const invalidResponse = {
        difficulty: 15, // Invalid: > 10
        explanation: 'test explanation',
        recommendations: ['test recommendation']
      };
      
      const mockLLM = new MockLLM(invalidResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      await expect(chain.invoke({ gameDef: sampleGameDef })).rejects.toThrow();
    });

    it('throws if explanation is too short', async () => {
      const invalidResponse = {
        difficulty: 5,
        explanation: 'short', // Invalid: < 10 characters
        recommendations: ['test recommendation']
      };
      
      const mockLLM = new MockLLM(invalidResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      await expect(chain.invoke({ gameDef: sampleGameDef })).rejects.toThrow();
    });

    it('throws if recommendations array is empty', async () => {
      const invalidResponse = {
        difficulty: 5,
        explanation: 'valid explanation here',
        recommendations: [] // Invalid: empty array
      };
      
      const mockLLM = new MockLLM(invalidResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      await expect(chain.invoke({ gameDef: sampleGameDef })).rejects.toThrow();
    });
  });

  describe('Token Counting', () => {
    it('increments sharedState.tokenCount when provided', async () => {
      const sharedState = { tokenCount: 0 };
      const mockResponse = {
        difficulty: 5,
        explanation: 'test explanation for token counting',
        recommendations: ['test recommendation']
      };
      
      const mockLLM = new MockLLM(mockResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM, { sharedState });
      
      await chain.invoke({ gameDef: sampleGameDef });
      
      expect(sharedState.tokenCount).toBeGreaterThan(0);
    });

    it('works without sharedState', async () => {
      const mockResponse = {
        difficulty: 5,
        explanation: 'test explanation without shared state',
        recommendations: ['test recommendation']
      };
      
      const mockLLM = new MockLLM(mockResponse);
      const chain = await createDifficultyAnalyzerChain(mockLLM);
      
      const result = await chain.invoke({ gameDef: sampleGameDef });
      
      expect(result.difficulty).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed LLM response gracefully', async () => {
      const malformedLLM = new FlexibleMalformedLLM('invalidSchema');
      const chain = await createDifficultyAnalyzerChain(malformedLLM);
      
      await expect(chain.invoke({ gameDef: sampleGameDef })).rejects.toThrow();
    });
  });
});
```

## Step 5: Integration Testing (Optional)

**File**: `server/tests/integration/design/DifficultyAnalyzerChain.openai.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import { createDifficultyAnalyzerChain } from '../../../server/agents/chains/design/DifficultyAnalyzerChain.js';
import { ChatOpenAI } from '@langchain/openai';

// Only run if OPENAI_API_KEY is set
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

(hasOpenAIKey ? describe : describe.skip)('DifficultyAnalyzerChain integration (ChatOpenAI)', () => {
  it('analyzes difficulty with real LLM', async () => {
    const realLLM = new ChatOpenAI({ 
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: 0.1 
    });
    
    const chain = await createDifficultyAnalyzerChain(realLLM);
    
    const sampleGame = {
      title: 'Reaction Master',
      description: 'Fast-paced reaction game with multiple simultaneous inputs',
      mechanics: ['react', 'multitask', 'timing'],
      winCondition: 'Complete 20 challenges without missing'
    };
    
    const result = await chain.invoke({ gameDef: sampleGame });
    
    // Verify structure
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('recommendations');
    
    // Verify constraints
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(10);
    expect(result.explanation.length).toBeGreaterThan(10);
    expect(result.recommendations).toBeInstanceOf(Array);
    expect(result.recommendations.length).toBeGreaterThan(0);
    
    // Log for manual inspection
    console.log('Real LLM Analysis:', JSON.stringify(result, null, 2));
  }, 30000); // 30 second timeout for real LLM
});
```

## Step 6: Add to GameDesignChain (Optional)

If you want to integrate this into the main design pipeline:

**File**: `server/agents/chains/design/GameDesignChain.js`

```javascript
// Add import
import { createDifficultyAnalyzerChain } from './DifficultyAnalyzerChain.js';

// In createGameDesignChain function, add:
const difficultyChain = await createDifficultyAnalyzerChain(llm, { sharedState });

// In the invoke method, add after final assembly:
const difficultyAnalysis = await difficultyChain.invoke({ 
  gameDef: finalGameDef 
});

// Include in final result:
return {
  ...finalGameDef,
  difficultyAnalysis
};
```

## Step 7: Verification

Run the complete verification process:

```bash
# Run your new tests
npm test -- DifficultyAnalyzerChain.test.js

# Run all tests to ensure no regressions
npm test

# Run linting
npm run lint

# Optional: Test with real LLM (if you have OPENAI_API_KEY)
OPENAI_API_KEY=your-key npm test -- DifficultyAnalyzerChain.openai.test.js
```

## ✅ Success Checklist

Your chain is successfully added when:
- [ ] Schema is defined in `langchain-schemas.js`
- [ ] Prompt template exists and is clear
- [ ] Chain implementation follows chainFactory pattern
- [ ] Comprehensive tests cover happy path, validation, and errors
- [ ] All tests pass (100% success rate)
- [ ] Linting passes without errors
- [ ] Token counting works correctly
- [ ] Integration test works with real LLM (optional)
- [ ] Chain can be integrated into larger workflows

## 🚨 Common Pitfalls to Avoid

1. **Forgetting async/await**: All chain creation is async
2. **Missing input validation**: Always validate required inputs
3. **Schema mismatches**: Ensure your mock responses match the schema
4. **Missing token counting tests**: Always test sharedState integration
5. **Hardcoded values**: Use appropriate chainFactory presets
6. **Incomplete error handling**: Test malformed LLM responses
7. **Missing edge cases**: Test boundary conditions in your schema

## 🔄 Modification Pattern

This same pattern can be used for:
- **Analysis chains**: Sentiment, complexity, quality analysis
- **Generation chains**: Alternative content generation
- **Validation chains**: Custom validation logic
- **Transformation chains**: Format conversion or enhancement

Simply replace the schema, prompt, and logic while following the same structure and testing patterns.

---

**Remember**: This example demonstrates the complete lifecycle of adding a new chain. Always follow this pattern for consistent, reliable, and well-tested chain implementations.