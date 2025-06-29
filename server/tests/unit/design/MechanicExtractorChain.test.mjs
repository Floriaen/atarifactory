import { describe, it, expect } from 'vitest';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';
import { createMechanicExtractorChain } from '../../../agents/chains/design/MechanicExtractorChain.mjs';

/**
 * MechanicExtractorChain unit tests
 * - Positive: valid JSON output from MockLLM
 * - Negative: malformed LLM output via FlexibleMalformedLLM
 * - Contract: expects { content: JSON.stringify({ mechanics: [...] }) }
 */
describe('MechanicExtractorChain (ESM)', () => {
  it('extracts mechanics (happy path)', async () => {
    const mockLLM = new MockLLM(JSON.stringify({ mechanics: ['jump', 'dodge'] }));
    const chain = createMechanicExtractorChain(mockLLM);
    const input = { loop: 'Player jumps between platforms and dodges lasers.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
    expect(result.mechanics).toContain('jump');
    expect(result.mechanics).toContain('dodge');
  });

  it('throws if input is missing', async () => {
    const mockLLM = new MockLLM(JSON.stringify({ mechanics: ['jump', 'dodge'] }));
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: loop');
  });

  it('throws if LLM output missing content', async () => {
    const llm = new FlexibleMalformedLLM('missingContent');
    const chain = createMechanicExtractorChain(llm);
    await expect(chain.invoke({ loop: 'foo' })).rejects.toThrow('LLM output missing content');
  });

  it('throws if LLM output is not JSON', async () => {
    const llm = new FlexibleMalformedLLM('notJson');
    const chain = createMechanicExtractorChain(llm);
    await expect(chain.invoke({ loop: 'foo' })).rejects.toThrow('LLM output missing content');
  });

  it('throws if LLM output missing mechanics array', async () => {
    const llm = new FlexibleMalformedLLM('missingMechanics');
    const chain = createMechanicExtractorChain(llm);
    await expect(chain.invoke({ loop: 'foo' })).rejects.toThrow('LLM output missing content');
  });

  it('throws if loop is missing in input', async () => {
    const mockLLM = new MockLLM(JSON.stringify({ mechanics: ['jump', 'dodge'] }));
    const chain = createMechanicExtractorChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: loop');
  });
});
