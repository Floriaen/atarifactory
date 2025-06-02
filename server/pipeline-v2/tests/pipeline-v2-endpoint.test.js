const request = require('supertest');
const path = require('path');
const { runPipeline } = require('../controller');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');

jest.setTimeout(20000);

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

  it('should run the full pipeline with the correct llmClient', async () => {
    const result = await runPipeline('Test Integration Game', { llmClient });
    // ... assertions ...
  });
}); 