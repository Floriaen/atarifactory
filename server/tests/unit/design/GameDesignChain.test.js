const { GameDesignChain, createGameDesignChain } = require('../../../agents/chains/design/GameDesignChain');

describe('GameDesignChain (integration)', () => {
  it('produces a valid, playable game definition from minimal input', async () => {
    const input = {};
    const result = await GameDesignChain.invoke(input);
    expect(result).toHaveProperty('gameDef');
    expect(result.gameDef).toHaveProperty('title');
    expect(result.gameDef).toHaveProperty('mechanics');
    expect(result.gameDef).toHaveProperty('winCondition');
    expect(result.gameDef).toHaveProperty('entities');
    expect(result.gameDef).toHaveProperty('description');
    // Playability check (if present)
    if (result.gameDef.playability) {
      expect(result.gameDef.playability).toBe('valid');
    }
  });
  });

  it('throws if IdeaGeneratorChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke;
    require('../../../agents/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({})).rejects.toThrow('Invalid output from IdeaGeneratorChain');
    } finally {
      require('../../../agents/chains/design/IdeaGeneratorChain').IdeaGeneratorChain.invoke = orig;
    }
  });

  it('throws if LoopClarifierChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/LoopClarifierChain').LoopClarifierChain.invoke;
    require('../../../agents/chains/design/LoopClarifierChain').LoopClarifierChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({})).rejects.toThrow('Invalid output from LoopClarifierChain');
    } finally {
      require('../../../agents/chains/design/LoopClarifierChain').LoopClarifierChain.invoke = orig;
    }
  });

  it('throws if MechanicExtractorChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/MechanicExtractorChain').MechanicExtractorChain.invoke;
    require('../../../agents/chains/design/MechanicExtractorChain').MechanicExtractorChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({ title: 'Laser Leap', pitch: 'desc' })).rejects.toThrow('Invalid output from MechanicExtractorChain');
    } finally {
      require('../../../agents/chains/design/MechanicExtractorChain').MechanicExtractorChain.invoke = orig;
    }
  });

  it('throws if WinConditionBuilderChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/WinConditionBuilderChain').WinConditionBuilderChain.invoke;
    require('../../../agents/chains/design/WinConditionBuilderChain').WinConditionBuilderChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({ title: 'Laser Leap', pitch: 'desc', loop: 'foo', mechanics: ['bar'] })).rejects.toThrow('Invalid output from WinConditionBuilderChain');
    } finally {
      require('../../../agents/chains/design/WinConditionBuilderChain').WinConditionBuilderChain.invoke = orig;
    }
  });

  it('throws if EntityListBuilderChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/EntityListBuilderChain').EntityListBuilderChain.invoke;
    require('../../../agents/chains/design/EntityListBuilderChain').EntityListBuilderChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({ title: 'Laser Leap', pitch: 'desc', loop: 'foo', mechanics: ['bar'], winCondition: 'baz' })).rejects.toThrow('Invalid output from EntityListBuilderChain');
    } finally {
      require('../../../agents/chains/design/EntityListBuilderChain').EntityListBuilderChain.invoke = orig;
    }
  });

  it('throws if PlayabilityHeuristicChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/PlayabilityHeuristicChain').PlayabilityHeuristicChain.invoke;
    require('../../../agents/chains/design/PlayabilityHeuristicChain').PlayabilityHeuristicChain.invoke = async () => 123;
    try {
      await expect(GameDesignChain.invoke({ title: 'Laser Leap', pitch: 'desc', loop: 'foo', mechanics: ['bar'], winCondition: 'baz', entities: ['e'] })).rejects.toThrow('Invalid output from PlayabilityHeuristicChain');
    } finally {
      require('../../../agents/chains/design/PlayabilityHeuristicChain').PlayabilityHeuristicChain.invoke = orig;
    }
  });

  it('throws if FinalAssemblerChain returns malformed output', async () => {
    const orig = require('../../../agents/chains/design/FinalAssemblerChain').FinalAssemblerChain.invoke;
    require('../../../agents/chains/design/FinalAssemblerChain').FinalAssemblerChain.invoke = async () => ({ bad: 'data' });
    try {
      await expect(GameDesignChain.invoke({ title: 'Laser Leap', pitch: 'desc', loop: 'foo', mechanics: ['bar'], winCondition: 'baz', entities: ['e'] })).rejects.toThrow('Invalid output from FinalAssemblerChain');
    } finally {
      require('../../../agents/chains/design/FinalAssemblerChain').FinalAssemblerChain.invoke = orig;
    }
  });

describe('GameDesignChain exports', () => {
  it('should provide a createGameDesignChain factory that returns the chain', () => {
    const chain = createGameDesignChain();
    expect(chain).toBe(GameDesignChain);
    expect(typeof chain.invoke).toBe('function');
  });
});
