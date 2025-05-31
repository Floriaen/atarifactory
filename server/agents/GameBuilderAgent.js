const fs = require('fs');
const path = require('path');

const PROMPT_TEMPLATE_PATH = path.join(__dirname, 'prompts', 'GameBuilderAgent.prompt.txt');
const LOGS_DIR = path.join(__dirname, '../logs');
const CONTROL_BAR_ASSETS = [
  { src: path.join(__dirname, '../controlBar', 'controlBar.html'), dest: 'assets/controlBar.html' },
  { src: path.join(__dirname, '../controlBar', 'controlBar.css'), dest: 'assets/controlBar.css' },
  { src: path.join(__dirname, '../controlBar', 'controlBar.js'), dest: 'assets/controlBar.js' },
];
const GAME_BOILERPLATE_PATH = path.join(__dirname, '../gameBoilerplate.html');

async function GameBuilderAgent(gameId, gameSpec, mechanicsBlock) {
  let gameJs = '';
  let instructions = '';
  // Read prompt template from file and fill in variables
  let promptTemplate = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');
  const prompt = promptTemplate
    .replace(/{{title}}/g, gameSpec.title)
    .replace(/{{description}}/g, gameSpec.description)
    .replace(/{{mechanics}}/g, mechanicsBlock.mechanics.join(', '))
    .replace(/{{winCondition}}/g, mechanicsBlock.winCondition);
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful game developer. Only output valid vanilla JavaScript code for Canvas games.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1800,
      temperature: 0.8,
    });
    // Log prompt and response (simple: only prompt and first 10 lines of response)
    const responseText = response.choices[0].message.content;
    const responseLines = responseText.split('\n').slice(0, 10).join('\n');
    const llmLogPath = path.join(LOGS_DIR, `llm-${gameId}.log`);
    fs.writeFileSync(llmLogPath, JSON.stringify({ prompt, response_preview: responseLines }, null, 2));
    // Also log to server console
    console.log(`\n[LLM PROMPT for ${gameId}]\n${prompt}\n`);
    console.log(`[LLM RESPONSE (first 10 lines) for ${gameId}]\n${responseLines}\n`);
    // Extract code block from response
    const text = responseText;
    const match = text.match(/```(?:javascript)?([\s\S]*?)```/);
    gameJs = match ? match[1].trim() : text.trim();
    instructions = mechanicsBlock.mechanics.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ') + '. Win: ' + mechanicsBlock.winCondition;
  } catch (_e) {
    // Fallback to static template if LLM fails
    instructions = 'Tap/click to reverse the ball.';
    gameJs = '// Simple bouncing ball Canvas game\nconst canvas = document.getElementById(\'game-canvas\');\nconst ctx = canvas.getContext(\'2d\');\nlet x = canvas.width/2, y = canvas.height/2, vx = 3, vy = 2;\nfunction draw() {\n  ctx.clearRect(0,0,canvas.width,canvas.height);\n  ctx.beginPath();\n  ctx.arc(x, y, 20, 0, Math.PI*2);\n  ctx.fillStyle = \'#0074d9\';\n  ctx.fill();\n  if(x+20>canvas.width||x-20<0) vx=-vx;\n  if(y+20>canvas.height||y-20<0) vy=-vy;\n  x+=vx; y+=vy;\n  requestAnimationFrame(draw);\n}\ndraw();\n';
  }
  // Sanitize gameJs: wrap main game loop in try/catch to show errors in-canvas
  gameJs = gameJs.replace(/function gameLoop\s*\(/, 'function gameLoop(')
    .replace(/requestAnimationFrame\((gameLoop|draw)\);?/g, 'try { requestAnimationFrame($1); } catch(e) { showIngameError(e); }');
  // Add showIngameError helper
  gameJs += `\nfunction showIngameError(err) {\n  const canvas = document.getElementById('game-canvas');\n  if (!canvas) return;\n  const ctx = canvas.getContext('2d');\n  ctx.save();\n  ctx.fillStyle = 'rgba(0,0,0,0.85)';\n  ctx.fillRect(0, canvas.height/2-60, canvas.width, 120);\n  ctx.font = '20px monospace';\n  ctx.fillStyle = '#ff5555';\n  ctx.textAlign = 'center';\n  ctx.fillText('Game Error: ' + (err && err.message ? err.message : err), canvas.width/2, canvas.height/2);\n  ctx.restore();\n}`;
  // Copy control bar assets into the game assets directory
  const assets = {};
  for (const asset of CONTROL_BAR_ASSETS) {
    assets[asset.dest] = fs.readFileSync(asset.src, 'utf8');
  }
  // Read controlBar.html for HTML injection
  const controlBarHTML = assets['assets/controlBar.html'];
  // Read and fill the game boilerplate
  let boilerplate = fs.readFileSync(GAME_BOILERPLATE_PATH, 'utf8');
  boilerplate = boilerplate
    .replace(/{{title}}/g, gameSpec.title)
    .replace(/{{description}}/g, gameSpec.description)
    .replace(/{{instructions}}/g, instructions)
    .replace(/{{controlBarHTML}}/g, controlBarHTML)
    .replace(/{{gameId}}/g, gameId);
  // Fix asset URLs to include /games/{gameId}/assets/
  boilerplate = boilerplate
    .replace("href='assets/controlBar.css'", `href='/games/${gameId}/assets/controlBar.css'`)
    .replace("src='assets/controlBar.js'", `src='/games/${gameId}/assets/controlBar.js'`)
    .replace("src='assets/game.js'", `src='/games/${gameId}/assets/game.js'`);
  return {
    'index.html': boilerplate,
    'assets/game.js': gameJs,
    ...assets
  };
}

module.exports = GameBuilderAgent; 