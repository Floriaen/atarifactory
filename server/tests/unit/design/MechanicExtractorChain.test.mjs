import { describe, it, expect } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { createMechanicExtractorChain } from '../../../agents/chains/design/MechanicExtractorChain.mjs';

describe('MechanicExtractorChain (ESM)', () => {
  it('extracts mechanics', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'jump, dodge' }) });
    const chain = createMechanicExtractorChain(mockLLM);
    const input = { loop: 'Player jumps between platforms and dodges lasers.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
    expect(result.mechanics).toContain('jump');
    expect(result.mechanics).toContain('dodge');
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'jump, dodge' }) });
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({}) });
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({ loop: 'foo' })).rejects.toThrow('LLM output missing content');
    // Now test with empty content
    const mockLLM2 = new RunnableLambda({ func: async () => ({ content: '' }) });
    const chain2 = createMechanicExtractorChain(mockLLM2);
    await expect(chain2.invoke({ loop: 'foo' })).rejects.toThrow('Output missing required mechanics array');
  });

  it('throws if loop is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'jump, dodge' }) });
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'jump, dodge' }) });
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });
});
