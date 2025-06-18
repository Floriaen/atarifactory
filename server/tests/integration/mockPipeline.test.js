const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../../controller');

describe('Mock Pipeline Integration', () => {
  beforeAll(() => {
    process.env.MOCK_PIPELINE = '1';
  });

  it('should generate a game using the mock pipeline', async () => {
    const result = await runPipeline('Test Mock Game');
    const gameId = result.game.id;
    const gameFolder = path.join(__dirname, '../../games', gameId);

    // Check files exist
    expect(fs.existsSync(path.join(gameFolder, 'game.js'))).toBe(true);
    expect(fs.existsSync(path.join(gameFolder, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(gameFolder, 'controlBar.js'))).toBe(true);
    expect(fs.existsSync(path.join(gameFolder, 'controlBar.css'))).toBe(true);

    // Check game.js content matches mock
    const mockCode = fs.readFileSync(path.join(__dirname, '../mocks/game.js'), 'utf8');
    const generatedCode = fs.readFileSync(path.join(gameFolder, 'game.js'), 'utf8');
    expect(generatedCode.trim()).toBe(mockCode.trim());
  });
}); 