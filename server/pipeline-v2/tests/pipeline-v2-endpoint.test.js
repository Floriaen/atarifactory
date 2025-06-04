const request = require('supertest');
const path = require('path');
const { runPipeline } = require('../controller');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');

jest.setTimeout(120000);

let llmClient;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  llmClient = new SmartOpenAI(openai);
} else {
  llmClient = new MockSmartOpenAI();
}

describe('POST /api/pipeline-v2/generate', () => {
  let app;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = require(path.resolve(__dirname, '../../index.js'));
  });

  afterAll(() => {
    jest.resetModules();
    app = null;
  });

  it('should return the pipeline result with expected keys', async () => {
    const response = await request(app)
      .post('/api/pipeline-v2/generate')
      .send({ title: 'Test Integration Game' })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('gameDef');
    expect(response.body).toHaveProperty('plan');
    expect(response.body).toHaveProperty('code');
    expect(response.body).toHaveProperty('syntaxResult');
    expect(response.body).toHaveProperty('runtimeResult');
    expect(response.body).toHaveProperty('feedback');
  });

  it('should handle agent errors gracefully', async () => {
    jest.resetModules();
    // Mock StepBuilderAgent to throw
    jest.doMock('../agents/StepBuilderAgent', () => async () => { throw new Error('StepBuilderAgent failed'); });
    const appWithMock = require(path.resolve(__dirname, '../../index.js'));
    const response = await request(appWithMock)
      .post('/api/pipeline-v2/generate')
      .send({ title: 'Error Test Game' })
      .set('Accept', 'application/json');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/StepBuilderAgent failed/);
    jest.dontMock('../agents/StepBuilderAgent');
  });

  it('should run the full pipeline with the correct llmClient and produce LLM-driven outputs', async () => {
    process.env.TEST_LOGS = '1';
    // Simulate a plan with a step that will trigger StepFixerAgent (static error)
    const planWithError = [
      { id: 1, label: 'Setup canvas and loop' },
      { id: 2, label: 'Add DUPLICATE player entity' } // 'DUPLICATE' triggers mock static error
    ];
    // Minimal gameDef for PlannerAgent
    const gameDef = { title: 'Test Integration Game', description: '', mechanics: [], winCondition: '', entities: [] };
    // Step 1: StepBuilderAgent (no error)
    let currentCode = '';
    let step = planWithError[0];
    let stepCode = await require('../agents/StepBuilderAgent')({ currentCode, plan: planWithError, step }, { logger: llmClient.logger || console, traceId: 'test', llmClient });
    let errors = require('../agents/StaticCheckerAgent')({ currentCode, stepCode }, { logger: llmClient.logger || console, traceId: 'test' });
    currentCode = require('../agents/BlockInserterAgent')({ currentCode, stepCode }, { logger: llmClient.logger || console, traceId: 'test' });
    // Step 2: StepBuilderAgent (will trigger static error)
    step = planWithError[1];
    stepCode = await require('../agents/StepBuilderAgent')({ currentCode, plan: planWithError, step }, { logger: llmClient.logger || console, traceId: 'test', llmClient });
    errors = require('../agents/StaticCheckerAgent')({ currentCode, stepCode }, { logger: llmClient.logger || console, traceId: 'test' });
    let fixerOutput = null;
    if (errors.length > 0) {
      fixerOutput = await require('../agents/StepFixerAgent')({ currentCode, step, errorList: errors }, { logger: llmClient.logger || console, traceId: 'test', llmClient });
      expect(typeof fixerOutput).toBe('string');
      expect(fixerOutput.length).toBeGreaterThan(0);
      if (process.env.TEST_LOGS) {
        console.log('StepFixerAgent output:', fixerOutput);
      }
    }
    // Continue with the rest of the pipeline as before
    currentCode = require('../agents/BlockInserterAgent')({ currentCode, stepCode: fixerOutput || stepCode }, { logger: llmClient.logger || console, traceId: 'test' });
    const syntaxResult = require('../agents/SyntaxSanityAgent')({ code: currentCode }, { logger: llmClient.logger || console, traceId: 'test' });
    const runtimeResult = await require('../agents/RuntimePlayabilityAgent')({ code: currentCode }, { logger: llmClient.logger || console, traceId: 'test' });
    let feedback = require('../agents/FeedbackAgent')({ runtimeLogs: runtimeResult, stepId: planWithError.length }, { logger: llmClient.logger || console, traceId: 'test', llmClient });
    if (typeof feedback.then === 'function') feedback = await feedback;
    // Assert outputs
    expect(typeof currentCode).toBe('string');
    expect(currentCode.length).toBeGreaterThan(0);
    expect(syntaxResult).toBeDefined();
    expect(runtimeResult).toBeDefined();
    expect(feedback).toBeDefined();
    expect(['fixer', 'planner']).toContain(feedback.retryTarget);
    expect(typeof feedback.suggestion).toBe('string');
    if (process.env.TEST_LOGS) {
      console.log('Final code:', currentCode);
      console.log('Syntax result:', syntaxResult);
      console.log('Runtime result:', runtimeResult);
      console.log('Feedback:', feedback);
    }
  });
}); 