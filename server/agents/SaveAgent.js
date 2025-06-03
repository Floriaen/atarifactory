// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
const fs = require('fs');
const path = require('path');
const GAMES_DIR = path.join(__dirname, '../games');
const DUMMY_THUMB = '/public/dummy-thumb.png';

function SaveAgent(gameId, gameSpec, mechanicsBlock, gameFiles) {
  const gameFolder = path.join(GAMES_DIR, gameId);
  if (!fs.existsSync(gameFolder)) fs.mkdirSync(gameFolder);
  // Save gameSpec
  fs.writeFileSync(path.join(gameFolder, 'game.json'), JSON.stringify({ gameSpec, mechanicsBlock }, null, 2));
  // Save files (handle assets subfolder)
  for (const [fname, content] of Object.entries(gameFiles)) {
    const outPath = path.join(gameFolder, fname);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, content);
  }
  // Save a dummy thumbnail (just reference for now)
  return { thumbnail: DUMMY_THUMB };
}

module.exports = SaveAgent; 