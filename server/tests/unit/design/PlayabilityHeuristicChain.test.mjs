import { describe, it, expect } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { createPlayabilityHeuristicChain } from '../../../agents/chains/design/PlayabilityHeuristicChain.mjs';

describe('PlayabilityHeuristicChain (ESM)', () => {
  it('returns valid for win condition', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: '{"playabilityScore": 8, "rationale": "Has a clear win condition."}' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { winCondition: 'Survive' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ playabilityScore: 8, rationale: 'Has a clear win condition.' });
  });

  it('returns invalid for missing win condition', async () => {
    // Simulate LLM returning JSON but rationale explains missing win condition
    const mockLLM = new RunnableLambda({ func: async () => ({ content: '{"playabilityScore": 2, "rationale": "No win condition specified."}' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    const input = { gameDef: { foo: 'bar' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ playabilityScore: 2, rationale: 'No win condition specified.' });
  });

  it('throws if input is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: '{"playabilityScore": 8, "rationale": "Has a clear win condition."}' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if gameDef is missing', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ content: '{"playabilityScore": 8, "rationale": "Has a clear win condition."}' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new RunnableLambda({ func: async () => ({ foo: 'bar' }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if output is malformed (simulate)', async () => {
    // Not a JSON string
    const mockLLM = new RunnableLambda({ func: async () => ({ content: 123 }) });
    const chain = createPlayabilityHeuristicChain(mockLLM);
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });
});
