// Unit tests for ContextStepFixerAgent (pipeline-v3)
// See pipeline-v3-test-plan.md for scenario details

const ContextStepFixerAgent = require('../../agents/ContextStepFixerAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');

describe('ContextStepFixerAgent', () => {
  it('fixes code based on error list using MockOpenAI', async () => {
    const mockLlm = new MockOpenAI();
    mockLlm.agent = 'ContextStepFixerAgent';
    const sharedState = createSharedState();
    sharedState.gameSource = 'function update() { player.x += 5; }'; // missing semicolon, possible style error
    sharedState.plan = [
      { id: 1, description: 'Setup' },
      { id: 2, description: 'Add score' }
    ];
    sharedState.step = { id: 2, description: 'Add score' };
    sharedState.errors = [
      { line: 1, message: 'Missing semicolon', ruleId: 'semi' }
    ];

    const result = await ContextStepFixerAgent(sharedState, {
      logger: undefined,
      traceId: 'test-trace',
      llmClient: mockLlm
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('function update()');
    expect(sharedState.gameSource).toBe(result);
    expect(sharedState.metadata).toBeDefined();
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });
});
