const PlayabilityAutoFixAgent = require('../../agents/PlayabilityAutoFixAgent');
const { describe, it, expect } = require('@jest/globals');

// DesignValidationResult: { gameDef, isPlayable, suggestion, reason, note }

describe('PlayabilityAutoFixAgent', () => {
  it('should always call LLM and apply its fix for mechanic suggestion', async () => {
    const input = {
      gameDef: {
        name: 'Unplayable Game',
        mechanics: ['wait'],
        winCondition: 'Collect all coins.',
        entities: ['player', 'coin']
      },
      isPlayable: false,
      suggestion: "Add the 'move' and 'collect' mechanics."
    };
    const llmClient = {
      chatCompletion: jest.fn().mockResolvedValue({
        mechanics: ['wait', 'move', 'collect'],
        winCondition: 'Collect all coins.',
        entities: ['player', 'coin'],
        name: 'Unplayable Game'
      })
    };
    const result = await PlayabilityAutoFixAgent(input, { logger: null, traceId: 'test-fix-1', llmClient });
    expect(result.fixed).toBe(true);
    expect(result.gameDef.mechanics).toEqual(expect.arrayContaining(['wait', 'move', 'collect']));
    expect(result.note).toMatch(/LLM/);
    expect(llmClient.chatCompletion).toHaveBeenCalled();
  });

  it('should always call LLM and apply its fix for win condition suggestion', async () => {
    const input = {
      gameDef: {
        name: 'Unplayable Game',
        mechanics: ['move'],
        winCondition: 'Collect all coins.',
        entities: ['player', 'coin']
      },
      isPlayable: false,
      suggestion: "Change the win condition to 'Reach the exit.'"
    };
    const llmClient = {
      chatCompletion: jest.fn().mockResolvedValue({
        mechanics: ['move'],
        winCondition: 'Reach the exit.',
        entities: ['player', 'coin'],
        name: 'Unplayable Game'
      })
    };
    const result = await PlayabilityAutoFixAgent(input, { logger: null, traceId: 'test-fix-2', llmClient });
    expect(result.fixed).toBe(true);
    expect(result.gameDef.winCondition).toBe('Reach the exit.');
    expect(result.note).toMatch(/LLM/);
    expect(llmClient.chatCompletion).toHaveBeenCalled();
  });

  it('should always call LLM and apply its fix for entity suggestion', async () => {
    const input = {
      gameDef: {
        name: 'Unplayable Game',
        mechanics: ['move'],
        winCondition: 'Reach the exit.',
        entities: ['player']
      },
      isPlayable: false,
      suggestion: "Add the 'key' entity."
    };
    const llmClient = {
      chatCompletion: jest.fn().mockResolvedValue({
        mechanics: ['move'],
        winCondition: 'Reach the exit.',
        entities: ['player', 'key'],
        name: 'Unplayable Game'
      })
    };
    const result = await PlayabilityAutoFixAgent(input, { logger: null, traceId: 'test-fix-3', llmClient });
    expect(result.fixed).toBe(true);
    expect(result.gameDef.entities).toEqual(expect.arrayContaining(['player', 'key']));
    expect(result.note).toMatch(/LLM/);
    expect(llmClient.chatCompletion).toHaveBeenCalled();
  });

  it('should always call LLM and apply its fix for generic suggestion', async () => {
    const input = {
      gameDef: {
        name: 'Unplayable Game',
        mechanics: ['wait'],
        winCondition: 'Collect all coins.',
        entities: ['player', 'coin']
      },
      isPlayable: false,
      suggestion: "Try making it more fun."
    };
    const llmClient = {
      chatCompletion: jest.fn().mockResolvedValue({
        mechanics: ['wait', 'collect'],
        winCondition: 'Collect all coins.',
        entities: ['player', 'coin'],
        name: 'Unplayable Game'
      })
    };
    const result = await PlayabilityAutoFixAgent(input, { logger: null, traceId: 'test-fix-4', llmClient });
    expect(result.fixed).toBe(true);
    expect(result.gameDef.mechanics).toContain('collect');
    expect(result.note).toMatch(/LLM/);
    expect(llmClient.chatCompletion).toHaveBeenCalled();
  });
});
