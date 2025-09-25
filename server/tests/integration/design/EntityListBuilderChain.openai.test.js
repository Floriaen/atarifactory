import { describe, it, expect } from 'vitest';
import { createEntityListBuilderChain } from '../../../agents/chains/design/EntityListBuilderChain.js';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const RUN_OPENAI = process.env.RUN_OPENAI_INTEGRATIONS === '1';
const shouldRun = Boolean(RUN_OPENAI && OPENAI_API_KEY && OPENAI_MODEL);

const maybeDescribe = shouldRun ? describe : describe.skip;

maybeDescribe('EntityListBuilderChain integration (ChatOpenAI)', () => {
  it('extracts entities from a real LLM', async () => {
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      temperature: 0,
      modelName: OPENAI_MODEL,
      maxTokens: 256
    });
    const chain = await createEntityListBuilderChain(llm);
    const input = {
      context: {
        mechanics: ['jump', 'dodge', 'score'],
        loop: 'Player jumps between platforms, dodges obstacles, and scores points.',
        winCondition: 'Reach 100 points without falling.'
      }
    };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities.length).toBeGreaterThan(0);
    // Accept common expected entities
    expect(result.entities.some(e => /player|platform|obstacle|point/i.test(e))).toBe(true);
  });
});
