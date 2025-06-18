const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../../controller');
const { createSharedState } = require('../../types/SharedState');
const MockOpenAI = require('../mocks/MockOpenAI');
const GameDesignAgent = require('../../agents/GameDesignAgent');
const PlannerAgent = require('../../agents/PlannerAgent');
const ContextStepBuilderAgent = require('../../agents/ContextStepBuilderAgent');
const StepBuilderAgent = require('../../agents/StepBuilderAgent');
const ContextStepFixerAgent = require('../../agents/ContextStepFixerAgent');
const StepFixerAgent = require('../../agents/StepFixerAgent');
const FeedbackAgent = require('../../agents/FeedbackAgent');
const logger = require('../../utils/logger');

describe('Token Count Pipeline Integration', () => {
  beforeAll(() => {
    process.env.MOCK_PIPELINE = '1';
  });

  it('should increment token count in sharedState and emit updates (mocked)', async () => {
    const tokenCounts = [];
    const onStatusUpdate = (step, data) => {
      if (step === 'TokenCount' && data && typeof data.tokenCount === 'number') tokenCounts.push(data.tokenCount);
    };
    await runPipeline('Test Token Game', onStatusUpdate);
    const lastTokenCount = tokenCounts[tokenCounts.length - 1];
    expect(typeof lastTokenCount).toBe('number');
    expect(lastTokenCount).toBeGreaterThan(0);
  });

  it('should increment token count with real LLM if API key is set', async () => {
    if (!process.env.OPENAI_API_KEY) {
      return;
    }
    let lastTokenCount = null;
    const onStatusUpdate = (step, data) => {
      if (step === 'TokenCount' && data && typeof data.tokenCount === 'number') lastTokenCount = data.tokenCount;
    };
    // Use real pipeline
    await runPipeline('Test Real LLM Token Game', onStatusUpdate);
    expect(typeof lastTokenCount).toBe('number');
    expect(lastTokenCount).toBeGreaterThan(0);
  });

  it('should accumulate token count in manual agent calls (mocked)', async () => {
    const mockLlmClient = new MockOpenAI();
    const sharedState = createSharedState();
    sharedState.title = 'Manual Token Game';
    let lastTokenCount = null;
    global.onStatusUpdate = (step, data) => {
      if (step === 'TokenCount' && data && typeof data.tokenCount === 'number') {
        lastTokenCount = data.tokenCount;
      }
    };
    mockLlmClient.setAgent('GameDesignAgent');
    await GameDesignAgent(sharedState, { llmClient: mockLlmClient, logger });
    mockLlmClient.setAgent('PlannerAgent');
    await PlannerAgent(sharedState, { llmClient: mockLlmClient, logger });
    sharedState.currentStep = sharedState.plan[0];
    mockLlmClient.setAgent('ContextStepBuilderAgent');
    await ContextStepBuilderAgent(sharedState, { llmClient: mockLlmClient, logger });
    expect(typeof sharedState.tokenCount).toBe('number');
    expect(sharedState.tokenCount).toBeGreaterThan(0);
    expect(lastTokenCount).toBe(sharedState.tokenCount);
    delete global.onStatusUpdate;
  });
});
