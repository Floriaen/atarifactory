// Unit tests for ContextStepBuilderAgent (pipeline-v3)
// See pipeline-v3-test-plan.md for scenario details

// Pipeline-v3: ContextStepBuilderAgent unit tests
// Each test follows the Arrange/Act/Assert pattern and uses mocks or stubs as needed.
// Implementation details are left as TODOs for TDD-first workflow.

const ContextStepBuilderAgent = require('../../agents/ContextStepBuilderAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');

const mockLogger = { info: jest.fn(), error: jest.fn() };
const traceId = 'test-trace';

describe('ContextStepBuilderAgent', () => {
  test('Adds new code without erasing old', async () => {
    // Arrange
    const sharedState = createSharedState();
    sharedState.gameSource = 'function draw() { /* original drawing code */ }';
    sharedState.plan = [
      { id: 1, desc: 'Setup' },
      { id: 2, desc: 'Add score' }
    ];
    sharedState.step = { id: 2, description: 'Add score' };
    const expectedOutput = 'function draw() { /* original drawing code */ }\nlet score = 0;\nfunction increaseScore() { score++; }';
    const mockOpenAI = new MockOpenAI();
    mockOpenAI.setAgent('ContextStepBuilderAgent');

    // Act
    const result = await ContextStepBuilderAgent(sharedState, {
      logger: { info: () => {}, error: () => {} },
      traceId: 'test',
      llmClient: mockOpenAI
    });

    // Assert
    expect(result).toBe(expectedOutput);
    expect(sharedState.gameSource).toBe(expectedOutput);
    expect(result).toContain('function increaseScore()');
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  test('Respects guard-rails (alert)', () => {
    // TODO: Implement with createSharedState and canonical MockOpenAI
  });

  test('No external asset creation', () => {
    // TODO: Implement with createSharedState and canonical MockOpenAI
  });
});
