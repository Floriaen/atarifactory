const { OpenAI } = require('openai');

async function GameDesignerAgent() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  const prompt = `Generate a JSON object for a new, simple Atari-style game. The object should have: title, description, and genre. Example:
{"title": "Space Bounce", "description": "Bounce the ball to destroy all blocks.", "genre": "arcade"}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful game designer.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.8,
  });
  // Extract JSON from the response
  const text = response.choices[0].message.content;
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    return json;
  } catch (_e) {
    return { title: 'Untitled', description: 'Failed to parse gameSpec', genre: 'arcade' };
  }
}

module.exports = GameDesignerAgent; 