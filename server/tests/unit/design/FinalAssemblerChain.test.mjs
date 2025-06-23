import { describe, it, expect } from 'vitest';
import { createFinalAssemblerChain } from '../../../agents/chains/design/FinalAssemblerChain.mjs';

describe('FinalAssemblerChain (ESM)', () => {
  it('assembles a game definition', async () => {
    const mockLLM = { invoke: async () => ({ content: JSON.stringify({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) }) };
    const chain = createFinalAssemblerChain(mockLLM);
    const input = {
      title: 'Laser Leap',
      mechanics: ['move', 'jump', 'avoid'],
      winCondition: 'Survive for 45 seconds',
      entities: ['player', 'platform', 'laser', 'timer']
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
    const mockLLM = { invoke: async () => ({ content: JSON.stringify({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) }) };
    const chain = createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if required fields are missing', async () => {
    const mockLLM = { invoke: async () => ({ content: JSON.stringify({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) }) };
    const chain = createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { invoke: async () => ({ content: '{}' }) };
    const chain = createFinalAssemblerChain(mockLLM);
    // Provide all required input fields so output validation is exercised
    await expect(chain.invoke({ title: 'foo', mechanics: [], winCondition: '', entities: [] })).rejects.toThrow('Output missing required gameDef fields');
  });

  it('throws if output is unexpected (monkey-patched)', async () => {
    const mockLLM = { invoke: async () => ({ content: '{}' }) };
    const chain = createFinalAssemblerChain(mockLLM);
    // Provide all required input fields so output validation is exercised
    await expect(chain.invoke({ title: 'Laser Leap', mechanics: [], winCondition: '', entities: [] })).rejects.toThrow('Output missing required gameDef fields');
  });
});
