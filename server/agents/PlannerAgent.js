const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const PROMPT_TEMPLATE_PATH = path.join(__dirname, 'prompts', 'PlannerAgent.prompt.txt');

async function PlannerAgent(gameSpec) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  let promptTemplate = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
  const prompt = promptTemplate
    .replace(/{{title}}/g, gameSpec.title)
    .replace(/{{description}}/g, gameSpec.description)
    .replace(/{{mechanics}}/g, (gameSpec.mechanics || []).join(', '))
    .replace(/{{winCondition}}/g, gameSpec.winCondition);
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful game developer.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 400,
    temperature: 0.4,
  });
  const text = response.choices[0].message.content;
  // Parse numbered list into array of steps
  const steps = text
    .split(/\n+/)
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
  return steps;
}

module.exports = PlannerAgent; 