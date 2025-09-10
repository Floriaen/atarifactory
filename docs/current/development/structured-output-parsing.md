# Modern LangChain Structured Output: Best Practices

This document outlines the current best practices for structured LLM output using LangChain v0.3+ with `.withStructuredOutput()` and Zod schema validation in the atarifactory project.

## Modern Approach with Structured Output

### 1. Define Zod Schemas

Create comprehensive schemas in `server/schemas/langchain-schemas.js`:

```js
import { z } from 'zod';

export const ideaGeneratorSchema = z.object({
  title: z.string().min(1, 'Game title is required'),
  pitch: z.string().min(1, 'Game pitch is required')
});

export const plannerSchema = z.object({
  plan: z.array(z.object({
    id: z.number().positive('Plan step ID must be positive'),
    description: z.string().min(1, 'Plan step description is required')
  })).min(1, 'At least one plan step is required')
});
```

### 2. Use chainFactory for Structured Chains

```js
import { createStandardChain } from '../utils/chainFactory.js';
import { ideaGeneratorSchema } from '../schemas/langchain-schemas.js';

async function createGameInventorChain(llm, options = {}) {
  return await createStandardChain({
    chainName: 'GameInventorChain',
    promptFile: 'GameInventorChain.prompt.md',
    inputVariables: ['input'],
    schema: ideaGeneratorSchema,
    preset: 'creative',
    llm,
    sharedState: options.sharedState
  });
}
```

### 3. Automatic Schema Validation

The chainFactory automatically applies structured output:

```js
// In chainFactory.js
const configuredLLM = schema ? baseLLM.withStructuredOutput(schema) : baseLLM;
```

### 4. OpenAI Compatibility

For array outputs, wrap in objects for OpenAI compatibility:

```js
// WRONG: OpenAI rejects direct arrays
export const badSchema = z.array(z.string());

// CORRECT: Wrap arrays in objects
export const goodSchema = z.object({
  items: z.array(z.string())
});
```

## Testing with Structured Output

### Mock LLM Setup

```js
import { MockLLM } from '../../helpers/MockLLM.js';

// MockLLM automatically supports withStructuredOutput
const mockResponse = { name: 'Test Game', description: 'A test game' };
const mockLLM = new MockLLM(mockResponse);
const chain = await createGameInventorChain(mockLLM);
```

### Schema Validation Tests

```js
it('validates schema compliance', async () => {
  const chain = await createGameInventorChain(mockLLM);
  const result = await chain.invoke({ input: 'create a game' });
  
  // Zod validation is automatic - invalid data throws errors
  expect(result.name).toBeDefined();
  expect(result.description).toBeDefined();
});
```

## Migration from Legacy Patterns

### Before (Deprecated)
```js
// OLD: JsonOutputParser with manual parsing
.pipe(new JsonOutputParser())
.pipe(RunnableLambda.from(({ content }) => content))
```

### After (Current)
```js
// NEW: Structured output with Zod
const llm = new ChatOpenAI().withStructuredOutput(schema);
// No parsing needed - returns validated objects directly
```

## Current Architecture Benefits

1. **Type Safety**: Zod provides runtime validation and TypeScript types
2. **Error Handling**: Invalid responses throw descriptive errors
3. **No Parsing**: Direct object returns eliminate parsing complexity
4. **Reliability**: OpenAI's structured output mode is more reliable than prompt-based JSON
5. **Consistency**: All chains use the same pattern via chainFactory

## Reference Implementations

See these files for complete examples:
- `server/utils/chainFactory.js` - Core factory functions
- `server/schemas/langchain-schemas.js` - Schema definitions
- `server/agents/chains/design/IdeaGeneratorChain.js` - Creative chain example
- `server/agents/chains/design/PlannerChain.js` - Array output example

## Migration Checklist

When updating chains to modern patterns:

- [ ] Define Zod schema in `langchain-schemas.js`
- [ ] Convert to `createStandardChain()` or specialized factory
- [ ] Remove manual JSON parsing logic
- [ ] Update tests to use `MockLLM` with direct objects
- [ ] Ensure async chain creation is properly awaited

---

## References
- [LangChain JS Structured Output](https://js.langchain.com/docs/how_to/structured_output)
- [Zod Documentation](https://zod.dev/)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
