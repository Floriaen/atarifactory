import { describe, it, expect, vi } from 'vitest';
import { createIdeaGeneratorChain } from '../../../agents/chains/design/IdeaGeneratorChain.mjs';
import { MockLLM } from '../../helpers/MockLLM.js';
import { MalformedLLM } from '../../helpers/MalformedLLM.js';

// Basic smoke test for ESM import and minimal behavior
describe('createIdeaGeneratorChain (ESM)', () => {
  it('should be defined', async () => {
    expect(createIdeaGeneratorChain).toBeDefined();
    const mockLLM = new MockLLM(JSON.stringify({ title: 'Test Game', pitch: 'A fun test.' }));
    const chain = createIdeaGeneratorChain(mockLLM);
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
    // Test invoke actually works
    const result = await chain.invoke({ constraints: 'test' });
    expect(result).toHaveProperty('title', 'Test Game');
    expect(result).toHaveProperty('pitch', 'A fun test.');
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new MalformedLLM();
    const chain = createIdeaGeneratorChain(mockLLM);
    await expect(chain.invoke({ constraints: 'test' })).rejects.toThrow('LLM output missing content');
  });
  // Add more tests as needed for actual logic
});
