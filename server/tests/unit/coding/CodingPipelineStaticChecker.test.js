import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSharedState } from '../../../types/SharedState.js';

const staticCheckerRunMock = vi.fn().mockResolvedValue({ staticCheckPassed: true, errors: [] });

vi.mock('../../../agents/chains/StaticCheckerChain.js', () => ({
  CHAIN_STATUS: {
    name: 'StaticCheckerChain',
    label: 'Static Checker',
    description: 'Checking code syntax and style',
    category: 'coding'
  },
  run: staticCheckerRunMock
}));

const transformGameCodeWithLLMMock = vi.fn(async (sharedState) => sharedState.gameSource);

vi.mock('../../../agents/chains/ControlBarTransformerChain.js', () => ({
  CHAIN_STATUS: {
    name: 'ControlBarTransformerChain',
    label: 'Control Bar Transform',
    description: 'Adding mobile-friendly controls',
    category: 'coding'
  },
  transformGameCodeWithLLM: transformGameCodeWithLLMMock,
  createControlBarTransformerChain: vi.fn()
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.MOCK_PIPELINE;
});

describe('runCodingPipeline static checker integration', () => {
  it('passes generated code to the static checker', async () => {
    process.env.MOCK_PIPELINE = '1';
    const { runCodingPipeline } = await import('../../../agents/pipeline/codingPipeline.js');

    const sharedState = createSharedState();
    sharedState.plan = [{ id: 1, description: 'Generate code' }];
    sharedState.gameSource = 'const hero = 1;';

    await runCodingPipeline(sharedState, () => {});

    expect(staticCheckerRunMock).toHaveBeenCalledTimes(1);
    const [{ stepCode, currentCode }] = staticCheckerRunMock.mock.calls[0];
    expect(stepCode).toBe('const hero = 1;');
    expect(currentCode).toBe('const hero = 1;');
  });
});
