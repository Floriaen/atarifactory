import { describe, it, expect } from 'vitest';
import { createLoopClarifierChain } from '../../../agents/chains/design/LoopClarifierChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('LoopClarifierChain (ESM)', () => {
  it('clarifies main loop', async () => {
    const chain = await createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    const input = { context: { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' } };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });

  it('throws if input is missing', async () => {
    const chain = await createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('still works with partial context (no title or no pitch)', async () => {
    const chain = await createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    const r1 = await chain.invoke({ context: { pitch: 'foo' } });
    expect(r1).toHaveProperty('loop');
    const r2 = await chain.invoke({ context: { title: 'foo' } });
    expect(r2).toHaveProperty('loop');
  });

  it('throws if output is malformed', async () => {
    // First: missing content property
    const chain = await createLoopClarifierChain(new FlexibleMalformedLLM('missingContent'));
    await expect(chain.invoke({ context: { title: 'foo', pitch: 'bar' } })).rejects.toThrow('LLM output missing content');
    // Second: content is not valid JSON
    const chain2 = await createLoopClarifierChain(new FlexibleMalformedLLM('notJson'));
    await expect(chain2.invoke({ context: { title: 'foo', pitch: 'bar' } })).rejects.toThrow('LLM output missing content');
    // Third: content is valid JSON but missing loop
    const chain3 = await createLoopClarifierChain(new FlexibleMalformedLLM('missingLoop'));
    await expect(chain3.invoke({ context: { title: 'foo', pitch: 'bar' } })).rejects.toThrow('LLM output missing content');
  });

  it('handles nonsense input gracefully', async () => {
    const chain = await createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow('Input must be an object with required fields: context');
  });
});
