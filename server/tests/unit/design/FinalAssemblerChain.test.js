import { describe, it, expect } from 'vitest';
import { createFinalAssemblerChain } from '../../../agents/chains/design/FinalAssemblerChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('FinalAssemblerChain (ESM)', () => {
  it('assembles a game definition', async () => {
    const pitch = 'Dodge lasers and leap between platforms.';
    const mockContent = JSON.stringify({ gameDef: { title: 'Laser Leap', description: pitch, mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } });
    const mockLLM = new MockLLM(mockContent);
    const chain = await createFinalAssemblerChain(mockLLM);
    const input = {
      context: {
        title: 'Laser Leap',
        pitch: 'Dodge lasers and leap between platforms.',
        loop: 'Player jumps between platforms and dodges lasers.',
        mechanics: ['move', 'jump', 'avoid'],
        winCondition: 'Survive for 45 seconds',
        entities: ['player', 'platform', 'laser', 'timer']
      }
    };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('gameDef');
    expect(result.gameDef).toHaveProperty('title');
    expect(result.gameDef).toHaveProperty('description');
    expect(Array.isArray(result.gameDef.mechanics)).toBe(true);
    expect(typeof result.gameDef.winCondition).toBe('string');
    expect(Array.isArray(result.gameDef.entities)).toBe(true);
  });

  it('throws if input is missing', async () => {
    const pitch = 'Dodge lasers and leap between platforms.';
    const mockContent = JSON.stringify({ gameDef: { title: 'Laser Leap', description: pitch, mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } });
    const mockLLM = new MockLLM(mockContent);
    const chain = await createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('throws if required fields are missing', async () => {
    const pitch = 'Dodge lasers and leap between platforms.';
    const mockContent = JSON.stringify({ gameDef: { title: 'Laser Leap', description: pitch, mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } });
    const mockLLM = new MockLLM(mockContent);
    const chain = await createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: context');
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow('Input must be an object with required fields: context');
  });

  it('throws if output is malformed', async () => {
    const mockLLM = new FlexibleMalformedLLM('missingContent');
    const chain = await createFinalAssemblerChain(mockLLM);
    // Provide all required input fields so output validation is exercised
    await expect(chain.invoke({
      context: {
        title: 'foo',
        pitch: 'bar',
        loop: 'baz',
        mechanics: [],
        winCondition: '',
        entities: []
      }
    })).rejects.toThrow('LLM output missing content');
  });
});
