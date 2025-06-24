import { describe, it, expect, vi } from 'vitest';
import { createIdeaGeneratorChain } from '../../../agents/chains/design/IdeaGeneratorChain.mjs';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

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
    const mockLLM = new FlexibleMalformedLLM('missingContent');
    const chain = createIdeaGeneratorChain(mockLLM);
    await expect(chain.invoke({ constraints: 'test' })).rejects.toThrow('LLM output missing content');
  });
    it('should increment sharedState.tokenCount when provided', async () => {
    // Arrange: create a mock LLM that returns a known string
    const mockContent = JSON.stringify({ title: 'Token Game', pitch: 'Token pitch.' });
    const mockLLM = new MockLLM(mockContent);
    // Simulate sharedState
    const sharedState = { tokenCount: 0 };
    // Patch the chain to accept sharedState (future implementation)
    const chain = createIdeaGeneratorChain(mockLLM, { sharedState });
    // Act
    await chain.invoke({ constraints: 'test' });
    // The mockContent is 47 characters, so estimateTokens = 12
    expect(sharedState.tokenCount).toBeGreaterThan(0); // Will fail until implemented
  });
  // Add more tests as needed for actual logic
});
