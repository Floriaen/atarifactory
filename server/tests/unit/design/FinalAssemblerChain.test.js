const { createFinalAssemblerChain } = require('../../../agents/chains/design/FinalAssemblerChain');

describe('FinalAssemblerChain', () => {
  it('assembles a game definition', async () => {
    const mockLLM = { call: async () => ({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) };
    const chain = createFinalAssemblerChain(mockLLM);
    const input = {
      title: 'Laser Leap',
      pitch: 'Dodge lasers and leap between platforms.',
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
    const mockLLM = { call: async () => ({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) };
    const chain = createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke()).rejects.toThrow();
  });

  it('throws if required fields are missing', async () => {
    const mockLLM = { call: async () => ({ gameDef: { title: 'Laser Leap', description: 'Dodge lasers', mechanics: ['move'], winCondition: 'Survive', entities: ['player'] } }) };
    const chain = createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke({})).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo' })).rejects.toThrow();
    await expect(chain.invoke({ title: 'foo', pitch: 'bar' })).rejects.toThrow();
  });

  it('throws if output is malformed', async () => {
    const mockLLM = { call: async () => ({ foo: 'bar' }) };
    const chain = createFinalAssemblerChain(mockLLM);
    await expect(chain.invoke({ title: 'foo', pitch: 'bar', mechanics: [], winCondition: '', entities: [] })).rejects.toThrow('Output missing required gameDef fields');
  });

  it('returns malformed output if monkey-patched (simulate)', async () => {
    const mockLLM = { call: async () => ({ bad: 'data' }) };
    const chain = createFinalAssemblerChain(mockLLM);
    try {
      const result = await chain.invoke({ title: 'Laser Leap', pitch: 'desc', mechanics: [], winCondition: '', entities: [] });
      expect(result).toEqual({ bad: 'data' });
    } finally {
      FinalAssemblerChain.invoke = orig;
    }
  });
});
