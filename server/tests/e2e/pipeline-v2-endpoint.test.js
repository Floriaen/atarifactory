/**
 * Pipeline Integration Test Suite
 * 
 * This test suite verifies the complete game generation pipeline by testing each agent
 * individually and their interactions. It can be run in different modes:
 * 
 * 1. LLM Mode:
 *    - Real LLM: Set OPENAI_API_KEY environment variable
 *    - Mock LLM: Don't set OPENAI_API_KEY (uses MockSmartOpenAI)
 * 
 * 2. Logging Mode:
 *    - Verbose: Set TEST_LOGS=1
 *    - Silent: Don't set TEST_LOGS
 * 
 * Example commands:
 * - Run with real LLM and logs: OPENAI_API_KEY=sk-... TEST_LOGS=1 npm test
 * - Run with mock LLM and logs: TEST_LOGS=1 npm test
 * - Run with real LLM silently: OPENAI_API_KEY=sk-... npm test
 * - Run with mock LLM silently: npm test
 * 
 * Test Structure:
 * 1. Basic endpoint test - Verifies the API response structure
 * 2. Error handling test - Verifies proper error handling
 * 3. Full pipeline test - Tests each agent and their interactions:
 *    - GameDesignAgent: Creates initial game definition
 *    - PlannerAgent: Creates step-by-step plan
 *    - StepBuilderAgent: Generates code for each step
 *    - StaticCheckerAgent: Validates generated code
 *    - StepFixerAgent: Fixes any static errors
 *    - BlockInserterAgent: Merges code blocks
 *    - SyntaxSanityAgent: Final syntax check
 *    - RuntimePlayabilityAgent: Tests game runtime
 *    - FeedbackAgent: Provides feedback on the game
 */

const request = require('supertest');
const path = require('path');
const { MockSmartOpenAI } = require('../mocks/MockOpenAI');
const SmartOpenAI = require('../utils/SmartOpenAI');

// Set longer timeout for LLM operations
jest.setTimeout(300000);

// Initialize LLM client based on environment
let llmClient;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  llmClient = new SmartOpenAI(openai);
  console.log('Using real OpenAI API');
} else {
  llmClient = new MockSmartOpenAI();
  console.log('Using MockSmartOpenAI');
}

// Create a separate mock instance for feedback testing
const mockSmartOpenAI = new MockSmartOpenAI();

// Mock the controller module
jest.mock('../controller', () => {
  return {
    runPipeline: jest.fn().mockImplementation(async (title) => {
      return {
        gameDef: { title, description: 'Test game' },
        plan: [{ id: 1, label: 'Test step' }],
        code: 'console.log("test");',
        syntaxResult: { valid: true },
        runtimeResult: { canvasActive: true },
        feedback: { suggestion: 'Test feedback' }
      };
    })
  };
});

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

  // Test 1: Basic endpoint test
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

  // Test 2: Error handling test
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

  // Test 3: Full pipeline test
  it('should run the full pipeline with the correct llmClient and produce LLM-driven outputs', async () => {
    process.env.TEST_LOGS = '1';
    
    // Simulate a plan with a step that will trigger StepFixerAgent (static error)
    const planWithError = [
      { id: 1, label: 'Setup canvas and loop' },
      { id: 2, label: 'Add DUPLICATE player entity' } // 'DUPLICATE' triggers mock static error
    ];

    // Minimal gameDef for PlannerAgent
    const gameDef = { 
      title: 'Test Integration Game', 
      description: '', 
      mechanics: [], 
      winCondition: '', 
      entities: [] 
    };

    // Step 1: StepBuilderAgent (no error)
    if (process.env.TEST_LOGS) console.log('\nStep 1: Building initial code...');
    let currentCode = '';
    let step = planWithError[0];
    let stepCode = await require('../agents/StepBuilderAgent')(
      { currentCode, plan: planWithError, step }, 
      { logger: llmClient.logger || console, traceId: 'test', llmClient }
    );
    let errors = require('../agents/StaticCheckerAgent')(
      { currentCode, stepCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );
    currentCode = require('../agents/BlockInserterAgent')(
      { currentCode, stepCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );

    // Step 2: StepBuilderAgent (will trigger static error)
    if (process.env.TEST_LOGS) console.log('\nStep 2: Building code with error...');
    step = planWithError[1];
    stepCode = await require('../agents/StepBuilderAgent')(
      { currentCode, plan: planWithError, step }, 
      { logger: llmClient.logger || console, traceId: 'test', llmClient }
    );
    errors = require('../agents/StaticCheckerAgent')(
      { currentCode, stepCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );

    // Step 3: StepFixerAgent (fixes the error)
    let fixerOutput = null;
    if (errors.length > 0) {
      if (process.env.TEST_LOGS) console.log('\nStep 3: Fixing errors...');
      fixerOutput = await require('../agents/StepFixerAgent')(
        { currentCode, step, errorList: errors }, 
        { logger: llmClient.logger || console, traceId: 'test', llmClient }
      );
      expect(typeof fixerOutput).toBe('string');
      expect(fixerOutput.length).toBeGreaterThan(0);
      if (process.env.TEST_LOGS) {
        console.log('StepFixerAgent output:', fixerOutput);
      }
    }

    // Step 4: BlockInserterAgent (merges fixed code)
    if (process.env.TEST_LOGS) console.log('\nStep 4: Merging code...');
    currentCode = require('../agents/BlockInserterAgent')(
      { currentCode, stepCode: fixerOutput || stepCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );

    // Step 5: SyntaxSanityAgent (final syntax check)
    if (process.env.TEST_LOGS) console.log('\nStep 5: Checking syntax...');
    const syntaxResult = require('../agents/SyntaxSanityAgent')(
      { code: currentCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );

    // Step 6: RuntimePlayabilityAgent (tests game runtime)
    if (process.env.TEST_LOGS) console.log('\nStep 6: Testing runtime...');
    const runtimeResult = await require('../agents/RuntimePlayabilityAgent')(
      { code: currentCode }, 
      { logger: llmClient.logger || console, traceId: 'test' }
    );

    // Step 7: FeedbackAgent (provides feedback)
    if (process.env.TEST_LOGS) console.log('\nStep 7: Getting feedback...');
    let feedback = require('../agents/FeedbackAgent')(
      { runtimeLogs: runtimeResult, stepId: planWithError.length }, 
      { logger: llmClient.logger || console, traceId: 'test', llmClient: mockSmartOpenAI }
    );
    if (typeof feedback.then === 'function') feedback = await feedback;

    // Final assertions
    expect(typeof currentCode).toBe('string');
    expect(currentCode.length).toBeGreaterThan(0);
    expect(syntaxResult).toBeDefined();
    expect(runtimeResult).toBeDefined();
    expect(feedback).toBeDefined();
    expect(['fixer', 'planner']).toContain(feedback.retryTarget);
    expect(typeof feedback.suggestion).toBe('string');

    // Log final results if TEST_LOGS is set
    if (process.env.TEST_LOGS) {
      console.log('\nFinal Results:');
      console.log('Final code:', currentCode);
      console.log('Syntax result:', syntaxResult);
      console.log('Runtime result:', runtimeResult);
      console.log('Feedback:', feedback);
    }
  });
}); 