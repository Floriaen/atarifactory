const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const LOGS_DIR = path.join(__dirname, '../logs');

async function FixerAgent(gameId, gameJs, violationReport) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const openai = new OpenAI({ apiKey });
  // Log the violation report and original code
  const fixerLogPath = path.join(LOGS_DIR, `fixer-${gameId}.log`);
  fs.writeFileSync(fixerLogPath, JSON.stringify({ violationReport, original: gameJs }, null, 2));
  // Make the prompt more explicit about ctx.fillText
  const prompt = `You are a JavaScript code fixer.\n\nThe following code violates some project rules.\nViolation report:\n${JSON.stringify(violationReport, null, 2)}\n\nIf the violation is about missing ctx.fillText, you must add a call to ctx.fillText that displays the score, win/lose message, or instructions in the main game loop.\n\nPlease output a fixed version of the code that complies with all rules.\n\n---\n\n${gameJs}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a JavaScript code fixer. Only output valid JavaScript code.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1800,
    temperature: 0.5,
  });
  const responseText = response.choices[0].message.content;
  // Log the LLM response
  fs.appendFileSync(fixerLogPath, '\n\n[LLM RESPONSE]\n' + responseText);
  // Try to extract a code block
  const match = responseText.match(/```(?:javascript)?([\s\S]*?)```/);
  if (match && match[1]) {
    fs.appendFileSync(fixerLogPath, '\n\n[FIXED CODE]\n' + match[1].trim());
    return match[1].trim();
  }
  fs.appendFileSync(fixerLogPath, '\n\n[FIXED CODE]\n' + responseText.trim());
  return responseText.trim();
}

module.exports = FixerAgent; 