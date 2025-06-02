const request = require('supertest');
const path = require('path');

// Import the main server (assuming it exports the app)
let app;
beforeAll(() => {
  // Import the app after setting NODE_ENV to test
  process.env.NODE_ENV = 'test';
  app = require(path.resolve(__dirname, '../../index.js'));
});

describe('POST /api/pipeline-v2/generate', () => {
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
}); 