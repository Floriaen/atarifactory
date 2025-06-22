import { describe, it, expect } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { createPlayabilityHeuristicChain } from '../../../agents/chains/design/PlayabilityHeuristicChain.mjs';

describe('PlayabilityHeuristicChain (ESM)', () => {
  it('returns valid for win condition', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'valid' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { winCondition: 'Survive' } };
    const result = await chain.invoke(input);
    expect(result).toBe('valid');
  });

  it('returns invalid for missing win condition', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'invalid: missing win condition' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { foo: 'bar' } };
    const result = await chain.invoke(input);
    expect(result).toBe('invalid: missing win condition');
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'valid' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if gameDef is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 'valid' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ foo: 'bar' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if output is malformed (simulate)', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 123 }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });
});
