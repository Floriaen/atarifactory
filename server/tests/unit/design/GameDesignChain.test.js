// ESM port of GameDesignChain tests
import { describe, it, expect } from 'vitest';
import { createGameDesignChain, runDesignPhase } from '../../../agents/chains/design/GameDesignChain.js';

// Example minimal test: update and expand as needed

function makePhaseAwareMockLLM() {
  let phase = null;
  return {
    setPhase(newPhase) { phase = newPhase; },
    invoke: async () => {
      switch (phase) {
        case 'Idea': return { content: JSON.stringify({ title: 'Test Game', pitch: 'A fun test.' }) };
        case 'Loop': return { content: JSON.stringify({ loop: 'Test loop.' }) };
        case 'Mechanics': return { content: JSON.stringify({ mechanics: ['jump'] }) };
        case 'WinCondition': return { content: JSON.stringify({ winCondition: 'Win!' }) };
        case 'Entities': return { content: JSON.stringify({ entities: ['player'] }) };
        case 'Playability': return { content: JSON.stringify({ playabilityAssessment: 'Good', strengths: [], potentialIssues: [], score: 7 }) };
        case 'FinalAssembly': return { content: JSON.stringify({ gameDef: { title: 'Test', description: '', mechanics: [], winCondition: '', entities: [] } }) };
        default: return { content: '{}' };
      }
    },
    withStructuredOutput(schema) {
      const self = this;
      return {
        setPhase: self.setPhase.bind(self),
        invoke: async () => {
          const result = await self.invoke();
          try {
            const parsed = JSON.parse(result.content);
            return schema ? schema.parse(parsed) : parsed;
          } catch {
            return result;
          }
        }
      };
    }
  };
}

describe('GameDesignChain (ESM)', () => {
  it('should be defined and have invoke', async () => {
    const llm = makePhaseAwareMockLLM();
    // Patch runDesignPhase to set phase before each invoke
    const origRunDesignPhase = runDesignPhase;
    global.runDesignPhase = async (opts) => {
      llm.setPhase(opts.phase);
      return origRunDesignPhase(opts);
    };
    const chain = await createGameDesignChain({ llm });
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
  });

  it('createGameDesignChain returns chain object', async () => {
    const llm = makePhaseAwareMockLLM();
    // Patch runDesignPhase to set phase before each invoke
    const origRunDesignPhase = runDesignPhase;
    global.runDesignPhase = async (opts) => {
      llm.setPhase(opts.phase);
      return origRunDesignPhase(opts);
    };
    const chain = await createGameDesignChain({ llm });
    expect(chain).toBeDefined();
    expect(typeof chain.invoke).toBe('function');
  });

  // TODO: Add more robust integration/mocking tests as in CJS version
});
