import { describe, it, expect } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { createLoopClarifierChain } from '../../../agents/chains/design/LoopClarifierChain.mjs';

describe('LoopClarifierChain (ESM)', () => {
  it('clarifies main loop', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Loop: Mock loop.' }) });
    const chain = createLoopClarifierChain(mockLLM);
    const input = { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Loop: Mock loop.' }) });
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if title or pitch missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Loop: Mock loop.' }) });
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ pitch: 'foo' })).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    // First: missing content property
    const mockLLM = new RunnableLambda({ func: async () => ({}) });
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('LLM output missing content');
    // Second: content present but no loop pattern
    const mockLLM2 = new RunnableLambda({ func: async () => ({ content: 'No loop here.' }) });
    const chain2 = createLoopClarifierChain(mockLLM2);
    await expect(chain2.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('Output missing required loop string');
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = { invoke: async () => ({ content: 'Loop: Mock loop.' }) };
    const chain = createLoopClarifierChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });
});
