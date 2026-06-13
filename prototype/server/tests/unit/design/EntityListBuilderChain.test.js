import { describe, it, expect } from 'vitest';
import { createEntityListBuilderChain } from '../../../agents/chains/design/EntityListBuilderChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('EntityListBuilderChain (ESM)', () => {
  it('extracts entity list from mechanics', async () => {
    // Test strict JSON object
    const mockLLM1 = new MockLLM(JSON.stringify({ entities: ['mock1', 'mock2'] }));
    const chain1 = await createEntityListBuilderChain(mockLLM1);
    const input = {
      context: {
        mechanics: ['move', 'jump', 'avoid'],
        loop: 'Player jumps between platforms and dodges lasers.',
        winCondition: 'Reach the end of the level.'
      }
    };
    const result = await chain1.invoke(input);
    // The following log is to confirm what is returned
    console.log('[TEST] chain1.invoke result:', result);
    expect(result).toEqual({ entities: ['mock1', 'mock2'] });
    expect(Array.isArray(result.entities)).toBe(true);
  });

  it('throws if input is missing', async () => {
    // The mock LLM should never be called in this test
    const mockLLM2 = new FlexibleMalformedLLM('missingContent');
    const chain2 = await createEntityListBuilderChain(mockLLM2);
    await expect(chain2.invoke()).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('handles nonsense input gracefully', async () => {
    // LLM returns valid JSON string, but missing entities array
    const mockLLM4 = new FlexibleMalformedLLM('missingMechanics');
    const chain4 = await createEntityListBuilderChain(mockLLM4);
    await expect(chain4.invoke({ context: { mechanics: ['foo'], loop: 'bar', winCondition: 'baz' } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if output is malformed (mock returns bad data)', async () => {
    // LLM returns non-JSON or missing entities
    const mockLLM5 = new FlexibleMalformedLLM('notJson');
    const chain5 = await createEntityListBuilderChain(mockLLM5);
    await expect(
      chain5.invoke({
        context: {
          mechanics: ['foo'],
          loop: 'bar',
          winCondition: 'baz'
        }
      })
    ).rejects.toThrow('LLM output missing content');
    // Previously: await expect(chain5.invoke()).rejects.toThrow(...);
    await expect(
      chain5.invoke({
        context: {
          mechanics: ['foo'],
          loop: 'bar',
          winCondition: 'baz'
        }
      })
    ).rejects.toThrow('LLM output missing content');
  });
});
