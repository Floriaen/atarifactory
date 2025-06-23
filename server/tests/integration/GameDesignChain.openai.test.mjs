// Integration test for GameDesignChain using real OpenAI LLMs
// Skips if OPENAI_API_KEY is not set
import { describe, it, expect } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { createGameDesignChain } from '../../agents/chains/design/GameDesignChain.mjs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

(OPENAI_API_KEY ? describe : describe.skip)('GameDesignChain (OpenAI integration)', () => {
  it('should run end-to-end with real OpenAI LLMs', async () => {
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4.1';
    const llmOpts = { model: openaiModel, temperature: 0, openAIApiKey: OPENAI_API_KEY };
    const ideaLLM = new ChatOpenAI(llmOpts);
    const loopLLM = new ChatOpenAI(llmOpts);
    const mechanicLLM = new ChatOpenAI(llmOpts);
    const winLLM = new ChatOpenAI(llmOpts);
    const entityLLM = new ChatOpenAI(llmOpts);
    const playabilityLLM = new ChatOpenAI(llmOpts);
    const finalLLM = new ChatOpenAI(llmOpts);
    const chain = createGameDesignChain({ ideaLLM, loopLLM, mechanicLLM, winLLM, entityLLM, playabilityLLM, finalLLM });
    const input = {
      title: 'Test Game',
      pitch: 'A puzzle platformer where you control gravity.',
      constraints: 'No violence. Must be playable in 5 minutes.'
    };
    const result = await chain.invoke(input);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    const gameDef = result.gameDef || result;
    expect(gameDef.title || gameDef.name).toBeTruthy();
    expect(gameDef.pitch || gameDef.description).toBeTruthy();
    expect(Array.isArray(gameDef.mechanics)).toBe(true);
    expect(typeof gameDef.winCondition).toBe('string');
    expect(Array.isArray(gameDef.entities)).toBe(true);
  }, 60000); // 60s timeout for real LLM
});
