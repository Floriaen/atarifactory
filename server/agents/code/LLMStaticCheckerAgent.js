const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const PROMPT_TEMPLATE_PATH = path.join(__dirname, 'prompts', 'LLMStaticCheckerAgent.prompt.txt');

async function LLMStaticCheckerAgent(currentCode, stepCode) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  let promptTemplate = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
  const prompt = promptTemplate
    .replace(/{{currentCode}}/g, currentCode)
    .replace(/{{stepCode}}/g, stepCode);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a JavaScript static analysis assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 256,
    temperature: 0.1
  });
  const content = response.choices[0].message.content.trim();
  if (/all good/i.test(content)) {
    return { valid: true, error: null };
  }
  return { valid: false, error: content };
}

module.exports = LLMStaticCheckerAgent; 