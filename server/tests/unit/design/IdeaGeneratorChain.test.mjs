import { describe, it, expect } from 'vitest';
import { createIdeaGeneratorChain } from '../../../agents/chains/design/IdeaGeneratorChain.mjs';
import { RunnableLambda } from '@langchain/core/runnables';

// Basic smoke test for ESM import and minimal behavior
describe('createIdeaGeneratorChain (ESM)', () => {
  it('should be defined', () => {
    expect(createIdeaGeneratorChain).toBeDefined();
    // Use RunnableLambda mock for LCEL compatibility
    const dummyLLM = new RunnableLambda({
      func: async (_input) => ({ content: 'Title: foo\nPitch: bar' })
    });
    const chain = createIdeaGeneratorChain(dummyLLM);
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
    // Test invoke actually works
    return chain.invoke({ constraints: 'test' }).then(result => {
      expect(result).toHaveProperty('title', 'foo');
      expect(result).toHaveProperty('pitch', 'bar');
    });
  });

  // Add more tests as needed for actual logic
});
