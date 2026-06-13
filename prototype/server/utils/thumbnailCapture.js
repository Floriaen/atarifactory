import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

/**
 * Captures a thumbnail screenshot of a game using Playwright
 * @param {string} gameId - The UUID of the game
 * @param {string} gameDir - Path to the game directory (defaults to server/games/<gameId>)
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} - True if thumbnail was successfully captured
 */
async function captureGameThumbnail(gameId, gameDir = null, options = {}) {
  const {
    timeout = 10000,
    waitForRender = 2000,
    width = 800,
    height = 600,
    outputPath = null
  } = options;

  // Default game directory path
  if (!gameDir) {
    gameDir = path.join(process.cwd(), 'server', 'games', gameId);
  }

  // Default output path for thumbnail
  const thumbnailPath = outputPath || path.join(gameDir, 'thumb.png');
  const indexPath = path.join(gameDir, 'index.html');

  // Verify game directory and index.html exist
  if (!fs.existsSync(gameDir)) {
    logger.error('Game directory not found', { gameId, gameDir });
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    logger.error('Game index.html not found', { gameId, indexPath });
    return false;
  }

  let browser = null;
  let page = null;

  try {
    logger.info('Starting thumbnail capture', { gameId, gameDir });

    // Launch headless browser via Playwright
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    // Create page and set viewport
    page = await browser.newPage();
    await page.setViewportSize({ width, height });

    // Set a reasonable timeout
    page.setDefaultTimeout(timeout);

    // Navigate to the game using file:// protocol
    const gameUrl = `file://${path.resolve(indexPath)}`;
    logger.debug('Loading game URL', { gameUrl });

    // For file:// URLs, wait for 'load' is enough
    await page.goto(gameUrl, { waitUntil: 'load' });

    // Wait for the game to initialize - look for canvas element
    await page.waitForSelector('canvas', { timeout: timeout / 2 });
    logger.debug('Canvas element found, waiting for game initialization');

    // Additional wait for game to render at least one frame
    await page.waitForTimeout(waitForRender);

    // Try to ensure the game has started by checking for typical game state
    try {
      await page.evaluate(() => {
        // Try to trigger a render or ensure the game loop has started
        if (window.requestAnimationFrame) {
          return new Promise(resolve => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(resolve);
            });
          });
        }
      });
    } catch (e) {
      logger.debug('Could not wait for animation frames, proceeding with capture', { error: e.message });
    }

    // Capture screenshot of the canvas element specifically
    const canvas = await page.locator('canvas').first();
    if (await canvas.count() > 0) {
      logger.debug('Capturing canvas screenshot');
      await canvas.screenshot({ path: thumbnailPath });
    } else {
      // Fallback to full page screenshot
      logger.debug('Canvas not found, capturing full page screenshot');
      await page.screenshot({ path: thumbnailPath, fullPage: false });
    }

    // Verify the thumbnail was created and has reasonable size
    const stats = fs.statSync(thumbnailPath);
    if (stats.size < 1000) { // Less than 1KB suggests something went wrong
      logger.warn('Thumbnail file size seems too small', { gameId, size: stats.size });
    }

    logger.info('Thumbnail captured successfully', { 
      gameId, 
      thumbnailPath: path.relative(process.cwd(), thumbnailPath),
      fileSize: stats.size 
    });

    return true;

  } catch (error) {
    logger.error('Failed to capture thumbnail', { 
      gameId, 
      error: error.message,
      stack: error.stack 
    });
    
    // Clean up failed thumbnail file if it exists
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath);
        logger.debug('Cleaned up failed thumbnail file', { thumbnailPath });
      } catch (cleanupError) {
        logger.warn('Could not clean up failed thumbnail file', { 
          thumbnailPath, 
          error: cleanupError.message 
        });
      }
    }
    
    return false;

  } finally {
    // Clean up browser resources
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (cleanupError) {
      logger.warn('Error cleaning up browser resources', { error: cleanupError.message });
    }
  }
}

/**
 * Updates the meta.json file to include thumbnail information
 * @param {string} gameId - The UUID of the game
 * @param {string} gameDir - Path to the game directory
 * @returns {Promise<boolean>} - True if meta.json was successfully updated
 */
async function updateGameMetaWithThumbnail(gameId, gameDir = null) {
  if (!gameDir) {
    gameDir = path.join(process.cwd(), 'server', 'games', gameId);
  }

  const metaPath = path.join(gameDir, 'meta.json');
  const thumbPath = path.join(gameDir, 'thumb.png');

  try {
    // Check if meta.json exists
    if (!fs.existsSync(metaPath)) {
      logger.error('meta.json not found', { gameId, metaPath });
      return false;
    }

    // Check if thumbnail exists
    if (!fs.existsSync(thumbPath)) {
      logger.warn('Thumbnail not found, skipping meta.json update', { gameId, thumbPath });
      return false;
    }

    // Read and parse existing meta.json
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);

    // Add thumbnail property
    meta.thumbnail = `/games/${gameId}/thumb.png`;

    // Write updated meta.json
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    
    logger.info('Updated meta.json with thumbnail', { gameId, thumbnail: meta.thumbnail });
    return true;

  } catch (error) {
    logger.error('Failed to update meta.json with thumbnail', { 
      gameId, 
      error: error.message 
    });
    return false;
  }
}

/**
 * Complete thumbnail capture and metadata update process
 * @param {string} gameId - The UUID of the game
 * @param {string} gameDir - Path to the game directory
 * @param {Object} options - Configuration options for capture
 * @returns {Promise<boolean>} - True if both capture and metadata update succeeded
 */
async function captureAndUpdateThumbnail(gameId, gameDir = null, options = {}) {
  logger.info('Starting complete thumbnail process', { gameId });

  // Capture thumbnail
  const captureSuccess = await captureGameThumbnail(gameId, gameDir, options);
  if (!captureSuccess) {
    logger.error('Thumbnail capture failed, aborting process', { gameId });
    return false;
  }

  // Update metadata
  const metaSuccess = await updateGameMetaWithThumbnail(gameId, gameDir);
  if (!metaSuccess) {
    logger.error('Meta.json update failed after successful capture', { gameId });
    return false;
  }

  logger.info('Thumbnail process completed successfully', { gameId });
  return true;
}

export { 
  captureGameThumbnail, 
  updateGameMetaWithThumbnail, 
  captureAndUpdateThumbnail 
};
