import { describe, expect, it } from 'vitest';
import { createBackgroundCodeChain } from '../../../agents/chains/coding/BackgroundCodeChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { mockBackgroundCodeResponse } from './__fixtures__/mockBackgroundCode.js';

describe('BackgroundCodeChain', () => {
  it('produces structured background code when LLM supports structured output', async () => {
    const mockLLM = new MockLLM(JSON.stringify(mockBackgroundCodeResponse));
    const chain = await createBackgroundCodeChain(mockLLM);
    const result = await chain.invoke({ context: 'Space shooter summary' });
    expect(result).toEqual(mockBackgroundCodeResponse);
  });

  it('throws when provided LLM lacks structured output helpers', async () => {
    const invalidLLM = { invoke: async () => ({}) };
    await expect(createBackgroundCodeChain(invalidLLM)).rejects.toThrow(
      'BackgroundCodeChain requires an LLM with structured output support'
    );
  });
});
