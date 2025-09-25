import { describe, it, expect } from 'vitest';
import { createPlayabilityHeuristicChain } from '../../../agents/chains/design/PlayabilityHeuristicChain.js';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const RUN_OPENAI = process.env.RUN_OPENAI_INTEGRATIONS === '1';
const shouldRun = Boolean(RUN_OPENAI && OPENAI_API_KEY && OPENAI_MODEL);

const maybeDescribe = shouldRun ? describe : describe.skip;

maybeDescribe('PlayabilityHeuristicChain integration (ChatOpenAI)', () => {
  it('evaluates playability from a real LLM', async () => {
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      temperature: 0,
      modelName: OPENAI_MODEL,
      maxTokens: 512
    });
    const chain = await createPlayabilityHeuristicChain(llm);
    const input = {
      context: {
        title: 'Memory Lane',
        pitch: 'A memory game where players recall details from scenes.',
        loop: 'Observe scene, recall, answer, feedback, repeat.',
        mechanics: ['observe', 'recall', 'answer', 'feedback', 'repeat'],
        winCondition: 'Answer all questions correctly across 10 scenes within 5 minutes.',
        entities: ['scene', 'question', 'player', 'timer', 'score']
      }
    };
    const result = await chain.invoke(input);
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('playabilityAssessment');
    expect(typeof result.playabilityAssessment).toBe('string');
    expect(result).toHaveProperty('strengths');
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(result).toHaveProperty('potentialIssues');
    expect(Array.isArray(result.potentialIssues)).toBe(true);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
  }, 20000);
});
