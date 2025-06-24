import { describe, it, expect } from 'vitest';
import { createPlayabilityHeuristicChain } from '../../../agents/chains/design/PlayabilityHeuristicChain.mjs';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('PlayabilityHeuristicChain (ESM)', () => {
  it('returns valid for win condition', async () => {
    const chain = createPlayabilityHeuristicChain(new MockLLM('{"playabilityScore": 8, "rationale": "Has a clear win condition."}'));
    const input = { gameDef: { winCondition: 'Survive' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ playabilityScore: 8, rationale: 'Has a clear win condition.' });
  });

  it('returns invalid for missing win condition', async () => {
    const chain = createPlayabilityHeuristicChain(new MockLLM('{"playabilityScore": 2, "rationale": "No win condition specified."}'));
    const input = { gameDef: { foo: 'bar' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ playabilityScore: 2, rationale: 'No win condition specified.' });
  });

  it('throws if input is missing', async () => {
    const chain = createPlayabilityHeuristicChain(new MockLLM('{"playabilityScore": 8, "rationale": "Has a clear win condition."}'));
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: gameDef');
  });

  it('throws if gameDef is missing', async () => {
    const chain = createPlayabilityHeuristicChain(new MockLLM('{"playabilityScore": 8, "rationale": "Has a clear win condition."}'));
    await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: gameDef');
  });

  it('throws if output is malformed', async () => {
    const chain = createPlayabilityHeuristicChain(new FlexibleMalformedLLM('missingContent'));
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if output is malformed (simulate)', async () => {
    const chain = createPlayabilityHeuristicChain(new FlexibleMalformedLLM('notJson'));
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });
});
