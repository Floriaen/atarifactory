import { describe, it, expect } from 'vitest';
import { createLoopClarifierChain } from '../../../agents/chains/design/LoopClarifierChain.mjs';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('LoopClarifierChain (ESM)', () => {
  it('clarifies main loop', async () => {
    const chain = createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    const input = { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });

  it('throws if input is missing', async () => {
    const chain = createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: title, pitch');
  });

  it('throws if title or pitch missing', async () => {
    const chain = createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    await expect(chain.invoke({ pitch: 'foo' })).rejects.toThrow('Input must be an object with required fields: title, pitch');
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow('Input must be an object with required fields: title, pitch');
  });

  it('throws if output is malformed', async () => {
    // First: missing content property
    const chain = createLoopClarifierChain(new FlexibleMalformedLLM('missingContent'));
    await expect(chain.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('LLM output missing content');
    // Second: content is not valid JSON
    const chain2 = createLoopClarifierChain(new FlexibleMalformedLLM('notJson'));
    await expect(chain2.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('LLM output missing content');
    // Third: content is valid JSON but missing loop
    const chain3 = createLoopClarifierChain(new FlexibleMalformedLLM('missingLoop'));
    await expect(chain3.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow('LLM output missing content');
  });

  it('handles nonsense input gracefully', async () => {
    const chain = createLoopClarifierChain(new MockLLM(JSON.stringify({ loop: 'Mock loop.' })));
    await expect(chain.invoke({ foo: 'bar' })).rejects.toThrow('Input must be an object with required fields: title, pitch');
  });
});
