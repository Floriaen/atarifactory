import { describe, it, expect, vi } from 'vitest';
import { createIdeaGeneratorChain } from '../../../agents/chains/design/IdeaGeneratorChain.mjs';

// Basic smoke test for ESM import and minimal behavior
describe('createIdeaGeneratorChain (ESM)', () => {
  it('should be defined', async () => {
    expect(createIdeaGeneratorChain).toBeDefined();
    const mockLLM = { invoke: async () => ({ content: JSON.stringify({ title: 'Test Game', pitch: 'A fun test.' }) }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
    // Test invoke actually works
    const result = await chain.invoke({ constraints: 'test' });
    expect(result).toHaveProperty('title', 'Test Game');
    expect(result).toHaveProperty('pitch', 'A fun test.');
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { invoke: async () => ({ content: '' }) };
    const chain = createIdeaGeneratorChain(mockLLM);
    await expect(chain.invoke({ constraints: 'test' })).rejects.toThrow('LLM output missing content');
  });
  // Add more tests as needed for actual logic
});
