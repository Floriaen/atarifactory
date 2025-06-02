const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const PROMPT_TEMPLATE_PATH = path.join(__dirname, 'prompts', 'DuplicateFixerAgent.prompt.txt');

async function DuplicateFixerAgent(plan, currentCode, stepCode, duplicates) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  let promptTemplate = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
  const planText = plan.map((s, i) => `${i+1}. ${s}`).join('\n');
  const prompt = promptTemplate
    .replace(/{{plan}}/g, planText)
    .replace(/{{currentCode}}/g, currentCode)
    .replace(/{{stepCode}}/g, stepCode)
    .replace(/{{duplicates}}/g, duplicates.join(', '));
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a JavaScript code fixer.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 512,
    temperature: 0.2
  });
  return response.choices[0].message.content.trim();
}

module.exports = DuplicateFixerAgent; 