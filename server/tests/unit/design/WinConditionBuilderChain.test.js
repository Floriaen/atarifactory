import { describe, it, expect } from 'vitest';
import { createWinConditionBuilderChain } from '../../../agents/chains/design/WinConditionBuilderChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('WinConditionBuilderChain (ESM)', () => {
  it('builds win condition', async () => {
    const mockLLM = new MockLLM(JSON.stringify({ winCondition: 'Mock win condition.' }));
    const chain = await createWinConditionBuilderChain(mockLLM);
    const input = { context: { mechanics: ['move', 'jump', 'avoid'] } };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('winCondition');
    expect(typeof result.winCondition).toBe('string');
    expect(result.winCondition).toBe('Mock win condition.');
  });

  it('throws if input is missing', async () => {
    const chain = await createWinConditionBuilderChain(new MockLLM(JSON.stringify({ winCondition: 'Mock win condition.' })));
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('throws if output is malformed', async () => {
    const chain = await createWinConditionBuilderChain(new FlexibleMalformedLLM('missingContent'));
    await expect(chain.invoke({ context: { mechanics: ['foo'] } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if mechanics is missing', async () => {
    const chain = await createWinConditionBuilderChain(new MockLLM(JSON.stringify({ winCondition: 'Mock win condition.' })));
    await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('handles nonsense input gracefully', async () => {
    const chain = await createWinConditionBuilderChain(new MockLLM(JSON.stringify({ winCondition: 'Mock win condition.' })));
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const chain = await createWinConditionBuilderChain(new FlexibleMalformedLLM('notJson'));
    await expect(chain.invoke({ context: { mechanics: ['foo'] } })).rejects.toThrow('LLM output missing content');
  });
});
