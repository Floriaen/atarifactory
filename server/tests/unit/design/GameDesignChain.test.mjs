// ESM port of GameDesignChain tests
import { describe, it, expect } from 'vitest';
import { createGameDesignChain } from '../../../agents/chains/design/GameDesignChain.mjs';

// Example minimal test: update and expand as needed

describe('GameDesignChain (ESM)', () => {
  it('should be defined and have invoke', async () => {
    const ideaLLM = { invoke: async () => ({ content: 'Title: Test Game\nPitch: A fun test.' }) };
    const loopLLM = { invoke: async () => ({ content: 'Loop: Test loop.' }) };
    const mechanicLLM = { invoke: async () => ({ content: JSON.stringify({ mechanics: ['jump'] }) }) };
    const playabilityLLM = { invoke: async () => ({ content: JSON.stringify({ playabilityScore: 7, rationale: 'Good' }) }) };
    const winLLM = { invoke: async () => ({ content: JSON.stringify({ winCondition: 'Win!' }) }) };
    const entityLLM = { invoke: async () => ({ content: JSON.stringify({ entities: ['player'] }) }) };
    const finalLLM = { invoke: async () => ({ content: JSON.stringify({ gameDef: { title: 'Test', description: '', mechanics: [], winCondition: '', entities: [] } }) }) };
    const chain = createGameDesignChain({ ideaLLM, loopLLM, mechanicLLM, playabilityLLM, winLLM, entityLLM, finalLLM });
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
  });

  it('createGameDesignChain returns chain object', async () => {
    const ideaLLM = { invoke: async () => ({ content: 'Title: Test Game\nPitch: A fun test.' }) };
    const loopLLM = { invoke: async () => ({ content: 'Loop: Test loop.' }) };
    const mechanicLLM = { invoke: async () => ({ content: JSON.stringify({ mechanics: ['jump'] }) }) };
    const playabilityLLM = { invoke: async () => ({ content: JSON.stringify({ playabilityScore: 7, rationale: 'Good' }) }) };
    const winLLM = { invoke: async () => ({ content: JSON.stringify({ winCondition: 'Win!' }) }) };
    const entityLLM = { invoke: async () => ({ content: JSON.stringify({ entities: ['player'] }) }) };
    const finalLLM = { invoke: async () => ({ content: JSON.stringify({ gameDef: { title: 'Test', description: '', mechanics: [], winCondition: '', entities: [] } }) }) };
    const chain = await createGameDesignChain({ ideaLLM, loopLLM, mechanicLLM, playabilityLLM, winLLM, entityLLM, finalLLM });
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
  });

  // TODO: Add more robust integration/mocking tests as in CJS version
});
