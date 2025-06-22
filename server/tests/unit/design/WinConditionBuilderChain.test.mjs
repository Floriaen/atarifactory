import { describe, it, expect } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { createWinConditionBuilderChain } from '../../../agents/chains/design/WinConditionBuilderChain.mjs';

describe('WinConditionBuilderChain (ESM)', () => {
  it('builds win condition', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Mock win condition.' }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    const input = { mechanics: ['move', 'jump', 'avoid'] };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('winCondition');
    expect(typeof result.winCondition).toBe('string');
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Mock win condition.' }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ foo: 'bar' }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({ mechanics: ['foo'] })).rejects.toThrow('LLM output missing content');
  });

  it('throws if mechanics is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Mock win condition.' }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('handles nonsense input gracefully', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'Mock win condition.' }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow();
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 123 }) });
    const chain = createWinConditionBuilderChain(mockLLM);
    await expect(chain.invoke({ mechanics: ['foo'] })).rejects.toThrow('LLM output missing content');
  });
});
