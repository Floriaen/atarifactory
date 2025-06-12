// IMPORTANT: This agent must receive llmClient via dependency injection if needed.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * RuntimePlayabilityAgent
 * Input: SharedState
 * Output: {
 *   canvasActive: boolean,
 *   inputResponsive: boolean,
 *   playerMoved: boolean,
 *   winConditionReachable: boolean,
 *   log?: any
 * }
 *
 * Runs the game code in a headless browser and checks playability.
 */
async function RuntimePlayabilityAgent(sharedState, { logger, traceId }) {
  logger.info('RuntimePlayabilityAgent called', { traceId });
  let browser;
  let page;
  let tmpFile;
  try {
    // Initialize metadata if it doesn't exist
    if (!sharedState.metadata) {
      sharedState.metadata = {};
    }
    // Write code to a temp file
    const tmpDir = os.tmpdir();
    tmpFile = path.join(tmpDir, `game-${Date.now()}.js`);
    fs.writeFileSync(tmpFile, sharedState.currentCode, 'utf8');

    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    page = await browser.newPage();
    
    // Read and prepare the boilerplate template
    const boilerplatePath = path.join(__dirname, '..', 'gameBoilerplate.html');
    let html = fs.readFileSync(boilerplatePath, 'utf8');
    
    // Replace template variables with test values
    html = html
      .replace('{{title}}', 'Test Game')
      .replace('{{description}}', 'Test game for runtime validation')
      .replace('{{instructions}}', 'Test instructions')
      .replace('{{gameId}}', 'test')
      .replace('{{controlBarHTML}}', fs.readFileSync(path.join(__dirname, '..', 'controlBar/controlBar.html'), 'utf8'));
    
    // Set the HTML content
    await page.setContent(html);
    
    // Inject the game code
    await page.addScriptTag({ path: tmpFile });
    // Wait a bit for the code to run and create canvas
    await new Promise(res => setTimeout(res, 500));
    // Check for canvas
    const canvasActive = await page.evaluate(() => !!document.querySelector('canvas'));

    // Simulate ArrowRight keydown event
    let inputResponsive = false;
    try {
      // Try to detect a global 'keys' object or similar pattern
      const before = await page.evaluate(() => {
        if (window.keys) return { ...window.keys };
        if (window.inputState) return { ...window.inputState };
        return null;
      });
      await page.keyboard.down('ArrowRight');
      await new Promise(res => setTimeout(res, 100));
      const after = await page.evaluate(() => {
        if (window.keys) return { ...window.keys };
        if (window.inputState) return { ...window.inputState };
        return null;
      });
      if (before && after) {
        inputResponsive = JSON.stringify(before) !== JSON.stringify(after);
      } else {
        // Fallback: check if any global variable changed
        inputResponsive = await page.evaluate(() => {
          return typeof window.keys === 'object' && window.keys['ArrowRight'] === true;
        });
      }
      await page.keyboard.up('ArrowRight');
    } catch (e) {
      // If any error, assume not responsive
      inputResponsive = false;
    }

    // Player movement detection
    let playerMoved = false;
    try {
      // Get initial player position
      const beforePos = await page.evaluate(() => {
        if (window.player && typeof window.player.x === 'number' && typeof window.player.y === 'number') {
          return { x: window.player.x, y: window.player.y };
        }
        return null;
      });
      // Simulate ArrowRight keydown again (in case movement is tied to input)
      await page.keyboard.down('ArrowRight');
      await new Promise(res => setTimeout(res, 200));
      await page.keyboard.up('ArrowRight');
      // Get new player position
      const afterPos = await page.evaluate(() => {
        if (window.player && typeof window.player.x === 'number' && typeof window.player.y === 'number') {
          return { x: window.player.x, y: window.player.y };
        }
        return null;
      });
      if (beforePos && afterPos) {
        playerMoved = beforePos.x !== afterPos.x || beforePos.y !== afterPos.y;
      }
    } catch (e) {
      playerMoved = false;
    }

    // Win condition detection
    let winConditionReachable = false;
    try {
      // Simulate a series of ArrowRight presses to try to win
      for (let i = 0; i < 10; i++) {
        await page.keyboard.down('ArrowRight');
        await new Promise(res => setTimeout(res, 100));
        await page.keyboard.up('ArrowRight');
        await new Promise(res => setTimeout(res, 50));
      }
      // Check for win flag or win message
      winConditionReachable = await page.evaluate(() => {
        if (window.win === true || window.hasWon === true) return true;
        // Check for win message in DOM
        const winTexts = ['win', 'congratulations', 'you win', 'victory'];
        const bodyText = document.body.innerText.toLowerCase();
        return winTexts.some(txt => bodyText.includes(txt));
      });
    } catch (e) {
      winConditionReachable = false;
    }

    const result = {
      canvasActive,
      inputResponsive,
      playerMoved,
      winConditionReachable
    };

    sharedState.metadata.lastUpdate = new Date();
    sharedState.runtimeResults = result;

    return result;
  } catch (err) {
    logger.error('RuntimePlayabilityAgent error', { traceId, error: err });
    const result = {
      canvasActive: false,
      inputResponsive: false,
      playerMoved: false,
      winConditionReachable: false,
      log: err.message
    };
    sharedState.metadata.lastUpdate = new Date();
    sharedState.runtimeResults = result;
    return result;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

module.exports = RuntimePlayabilityAgent; 