import { describe, it, expect } from 'vitest';
import { createEntityListBuilderChain } from '../../../agents/chains/design/EntityListBuilderChain.mjs';
import { RunnableLambda } from '@langchain/core/runnables';

describe('EntityListBuilderChain (ESM)', () => {
  it('extracts entity list from mechanics', async () => {
    const mockLLM = new RunnableLambda({
      func: async () => ({ entities: ['mock1', 'mock2'] })
    });
    const chain = createEntityListBuilderChain(mockLLM);
    const input = { mechanics: ['move', 'jump', 'avoid'], loop: 'Player jumps between platforms and dodges lasers.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ entities: ['mock'] }) });
    const chain = createEntityListBuilderChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if mechanics is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ entities: ['mock'] }) });
    const chain = createEntityListBuilderChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ entities: ['mock'] }) });
    const chain = createEntityListBuilderChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('throws if output is malformed (mock returns bad data)', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ bad: 'data' }) });
    const chain = createEntityListBuilderChain(mockLLM);
    await expect(chain.invoke({ mechanics: ['foo'] })).rejects.toThrow('Output missing required entities array');
  });
});
