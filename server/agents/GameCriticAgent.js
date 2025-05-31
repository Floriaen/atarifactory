const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const LOGS_DIR = path.join(__dirname, '../logs');

async function GameCriticAgent(gameId, gameSpec, gameJs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  const prompt = `You are an expert JavaScript game developer and code reviewer.\n\nHere is a game specification:\nTitle: ${gameSpec.title}\nDescription: ${gameSpec.description}\nMechanics: ${(gameSpec.mechanics || []).join(', ')}\nWin condition: ${gameSpec.winCondition || ''}\n\nBelow is the JavaScript code for a browser game using the Canvas API.\n\n1. Does this code implement a playable game as described?\n2. Can the player win and lose?\n3. Are the controls responsive?\n4. Are there any bugs or missing features?\n5. If there are issues, please output a corrected version of the code as a single JavaScript file (in a code block). If the code is fine, say so.\n\n---\n\n${gameJs}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert JavaScript game developer and code reviewer.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1800,
    temperature: 0.5,
  });
  const responseText = response.choices[0].message.content;
  const reviewLogPath = path.join(LOGS_DIR, `critic-${gameId}.log`);
  fs.writeFileSync(reviewLogPath, responseText);
  // Try to extract a code block
  const match = responseText.match(/```(?:javascript)?([\s\S]*?)```/);
  if (match && match[1]) {
    return { fixedJs: match[1].trim(), review: responseText };
  }
  return { fixedJs: null, review: responseText };
}

module.exports = GameCriticAgent; 