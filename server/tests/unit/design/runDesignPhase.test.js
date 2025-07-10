import { describe, it, expect, vi } from 'vitest';
import { runDesignPhase } from '../../../agents/chains/design/GameDesignChain.js';

// Mock chain with .invoke
function createMockChain(output, shouldThrow = false) {
  return {
    async invoke(input) {
      if (shouldThrow) throw new Error('Mock error');
      return output;
    }
  };
}

describe('runDesignPhase', () => {
  it('invokes the chain, logs, emits events, and validates output', async () => {
    const mockOutput = { foo: 'bar' };
    const chain = createMockChain(mockOutput);
    const logCalls = [];
    const logCOT = vi.fn(async (...args) => logCalls.push(args));
    const sharedState = {
      tokenCount: 42,
      onStatusUpdate: vi.fn()
    };
    const validate = (out) => out.foo === 'bar';

    const result = await runDesignPhase({
      chain,
      phase: 'TestPhase',
      input: { x: 1 },
      sharedState,
      logCOT,
      validate
    });

    expect(result).toEqual(mockOutput);
    expect(logCOT).toHaveBeenCalledWith('TestPhase', { x: 1 }, mockOutput);
    
    expect(sharedState.onStatusUpdate).toHaveBeenCalledWith('TokenCount', { tokenCount: 42 });
  });

  it('logs and throws when validation fails', async () => {
    const chain = createMockChain({ foo: 'bad' });
    const logCOT = vi.fn();
    const sharedState = { tokenCount: 0, onStatusUpdate: vi.fn() };
    const validate = (out) => out.foo === 'bar';
    await expect(runDesignPhase({ chain, phase: 'BadPhase', input: {}, sharedState, logCOT, validate })).rejects.toThrow('Invalid output from BadPhase');
    expect(logCOT).toHaveBeenCalledWith('Error', {}, expect.objectContaining({ error: expect.stringContaining('Invalid output from BadPhase') }));
  });

  it('logs and throws when chain throws', async () => {
    const chain = createMockChain({}, true);
    const logCOT = vi.fn();
    const sharedState = { tokenCount: 0, onStatusUpdate: vi.fn() };
    const validate = () => true;
    await expect(runDesignPhase({ chain, phase: 'ThrowPhase', input: {}, sharedState, logCOT, validate })).rejects.toThrow('Mock error');
    expect(logCOT).toHaveBeenCalledWith('Error', {}, expect.objectContaining({ error: 'Mock error' }));
  });
});
