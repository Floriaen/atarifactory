import { describe, it, expect } from 'vitest';
import { createPlayabilityHeuristicChain } from '../../../agents/chains/design/PlayabilityHeuristicChain.js';
import { MockLLM } from '../../helpers/MockLLM.js';
import { FlexibleMalformedLLM } from '../../helpers/MalformedLLM.js';

describe('PlayabilityHeuristicChain (ESM)', () => {
  it('returns valid for win condition', async () => {
    const chain = await createPlayabilityHeuristicChain(new MockLLM(JSON.stringify({ 
      playabilityAssessment: "Has a clear win condition.", 
      strengths: ["Clear objective"],
      potentialIssues: [],
      score: 8 
    })));
    const input = { gameDef: { winCondition: 'Survive' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ 
      playabilityAssessment: "Has a clear win condition.", 
      strengths: ["Clear objective"],
      potentialIssues: [],
      score: 8 
    });
  });

  it('returns invalid for missing win condition', async () => {
    const chain = await createPlayabilityHeuristicChain(new MockLLM(JSON.stringify({ 
      playabilityAssessment: "No win condition specified.", 
      strengths: [],
      potentialIssues: ["Missing win condition"],
      score: 2 
    })));
    const input = { gameDef: { foo: 'bar' } };
    const result = await chain.invoke(input);
    expect(result).toEqual({ 
      playabilityAssessment: "No win condition specified.", 
      strengths: [],
      potentialIssues: ["Missing win condition"],
      score: 2 
    });
  });

  it('throws if input is missing', async () => {
    const chain = await createPlayabilityHeuristicChain(new MockLLM(JSON.stringify({ playabilityScore: 8, rationale: "Has a clear win condition." })));
    await expect(chain.invoke()).rejects.toThrow('Input must be an object with required fields: gameDef');
  });

  it('throws if gameDef is missing', async () => {
    const chain = await createPlayabilityHeuristicChain(new MockLLM(JSON.stringify({ playabilityScore: 8, rationale: "Has a clear win condition." })));
    await expect(chain.invoke({})).rejects.toThrow('Input must be an object with required fields: gameDef');
  });

  it('throws if output is malformed', async () => {
    const chain = await createPlayabilityHeuristicChain(new FlexibleMalformedLLM('missingContent'));
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });

  it('throws if output is malformed (simulate)', async () => {
    const chain = await createPlayabilityHeuristicChain(new FlexibleMalformedLLM('notJson'));
    await expect(chain.invoke({ gameDef: { winCondition: 'Survive' } })).rejects.toThrow('LLM output missing content');
  });
});
