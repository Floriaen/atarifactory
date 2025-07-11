import { describe, it, expect } from 'vitest';
import { createMechanicExtractorChain } from '../../../agents/chains/design/MechanicExtractorChain.js';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
if (!OPENAI_MODEL) {
  throw new Error('OPENAI_MODEL must be set in your .env file');
}

describe('MechanicExtractorChain integration (ChatOpenAI)', () => {
  it('extracts mechanics from a real LLM', async () => {
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      temperature: 0,
      modelName: OPENAI_MODEL,
      maxTokens: 256
    });
    const chain = await createMechanicExtractorChain(llm);
    const input = { loop: 'Player jumps between platforms and dodges lasers.' };
    const result = await chain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
    expect(result.mechanics.length).toBeGreaterThan(0);
    expect(result.mechanics).toContain('jump');
    // Accept either 'dodge' or 'avoid' as LLMs may paraphrase
    expect(result.mechanics.some(m => /dodge|avoid/i.test(m))).toBe(true);
  });
});
