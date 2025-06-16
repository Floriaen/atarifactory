/**
 * Tests the BlockInserterAgent's ability to safely merge code blocks using AST-based manipulation.
 * 
 * Modes:
 * - Default: Uses real code merging
 * - Logging: Set TEST_LOGS=1
 */

const mockLogger = { info: () => {}, error: () => {}, warn: () => {} };
const logger = process.env.TEST_LOGS ? console : mockLogger;
const BlockInserterAgent = require('../../agents/BlockInserterAgent');
const MockOpenAI = require('../mocks/MockOpenAI');
const { createSharedState } = require('../../types/SharedState');
const OpenAI = (() => {
  try {
    return require('openai');
  } catch {
    return null;
  }
})();
const useRealLLM = process.env.TEST_LLM === '1' && process.env.OPENAI_API_KEY && OpenAI;
const parser = require('@babel/parser');
// const { runBlockInserterAgentTest } = require('../common/BlockInserterAgentTest');

function extractDeclarations(ast) {
  return ast.program.body.filter(
    node => node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration'
  );
}

describe('BlockInserterAgent', () => {
  it('should correctly hoist declarations and entrypoint calls for real-world complex input', async () => {
    const sharedState = createSharedState();
    // User's real-world problematic code sample
    sharedState.currentCode = `
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function gameLoop() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update game state
  // (This is where you would update positions, check for collisions, etc.)

  // Render game state
  // (This is where you would draw the player, enemies, etc.)

  // Request the next frame
  requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
const player = {
  x: canvas.width / 2,
  y: canvas.height - 30,
  width: 50,
  height: 10,
  speed: 5,
  moveLeft: false,
  moveRight: false
};

function updatePlayer() {
  if (player.moveLeft && player.x > 0) {
    player.x -= player.speed;
  }
  if (player.moveRight && player.x < canvas.width - player.width) {
    player.x += player.speed;
  }
}

function drawPlayer() {
  ctx.fillStyle = 'blue';
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Update game state
function updateGameState() {
  updatePlayer();
}

// Render game state
function renderGameState() {
  drawPlayer();
}

// Modify the game loop to include update and render functions
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateGameState();
  renderGameState();
  requestAnimationFrame(gameLoop);
}
// Add event listeners for keydown and keyup to control player movement
document.addEventListener('keydown', function(event) {
  if (event.code === 'ArrowLeft') {
    player.moveLeft = true;
  } else if (event.code === 'ArrowRight') {
    player.moveRight = true;
  }
});

document.addEventListener('keyup', function(event) {
  if (event.code === 'ArrowLeft') {
    player.moveLeft = false;
  } else if (event.code === 'ArrowRight') {
    player.moveRight = false;
  }
});
const lasers = [];

function shootLaser() {
  const laser = {
    x: player.x + player.width / 2,
    y: player.y,
    width: 5,
    height: 20,
    speed: 7
  };
  lasers.push(laser);
}

function updateLasers() {
  for (let i = 0; i < lasers.length; i++) {
    lasers[i].y -= lasers[i].speed;
    if (lasers[i].y < 0) {
      lasers.splice(i, 1);
      i--;
    }
  }
}

function drawLasers() {
  ctx.fillStyle = 'red';
  for (const laser of lasers) {
    ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
  }
}

document.addEventListener('keydown', function(event) {
  if (event.code === 'Space') {
    shootLaser();
  }
});

function updateGameState() {
  updatePlayer();
  updateLasers();
}

function renderGameState() {
  drawPlayer();
  drawLasers();
}
const alienShips = [];

function createAlienShip(x, y) {
  const alienShip = {
    x: x,
    y: y,
    width: 40,
    height: 20,
    speed: 2
  };
  alienShips.push(alienShip);
}

function drawAlienShips() {
  ctx.fillStyle = 'green';
  for (const alienShip of alienShips) {
    ctx.fillRect(alienShip.x, alienShip.y, alienShip.width, alienShip.height);
  }
}

// Initialize some alien ships for demonstration
createAlienShip(100, 50);
createAlienShip(200, 50);
createAlienShip(300, 50);

function renderGameState() {
  drawPlayer();
  drawLasers();
  drawAlienShips();
}
function updateAlienShips() {
  for (const alienShip of alienShips) {
    alienShip.y += alienShip.speed;
    // Check if the alien ship has reached the base
    if (alienShip.y + alienShip.height >= canvas.height) {
      // Handle the case where an alien ship reaches the base
      // This could be a lose condition or some other logic
    }
  }
}

function updateGameState() {
  updatePlayer();
  updateLasers();
  updateAlienShips();
}
function checkCollisions() {
  for (let i = 0; i < lasers.length; i++) {
    const laser = lasers[i];
    for (let j = 0; j < alienShips.length; j++) {
      const alienShip = alienShips[j];
      if (
        laser.x < alienShip.x + alienShip.width &&
        laser.x + laser.width > alienShip.x &&
        laser.y < alienShip.y + alienShip.height &&
        laser.y + laser.height > alienShip.y
      ) {
        // Collision detected
        // Handle collision in the next step
      }
    }
  }
}

function updateGameState() {
  updatePlayer();
  updateLasers();
  updateAlienShips();
  checkCollisions();
}
function checkCollisions() {
  for (let i = 0; i < lasers.length; i++) {
    const laser = lasers[i];
    for (let j = 0; j < alienShips.length; j++) {
      const alienShip = alienShips[j];
      if (
        laser.x < alienShip.x + alienShip.width &&
        laser.x + laser.width > alienShip.x &&
        laser.y < alienShip.y + alienShip.height &&
        laser.y + laser.height > alienShip.y
      ) {
        // Collision detected
        // Remove the alien ship and the laser
        alienShips.splice(j, 1);
        lasers.splice(i, 1);
        i--; // Adjust index after removal
        break; // Exit the inner loop as the laser is already removed
      }
    }
  }
}
player.isDodging = false;
player.dodgeCooldown = false;
player.dodgeSpeed = 15;
player.dodgeDuration = 200; // milliseconds
player.dodgeCooldownTime = 1000; // milliseconds

function dodge() {
  if (!player.isDodging && !player.dodgeCooldown) {
    player.isDodging = true;
    player.dodgeCooldown = true;
    const originalSpeed = player.speed;
    player.speed = player.dodgeSpeed;

    setTimeout(() => {
      player.isDodging = false;
      player.speed = originalSpeed;
    }, player.dodgeDuration);

    setTimeout(() => {
      player.dodgeCooldown = false;
    }, player.dodgeCooldownTime);
  }
}

document.addEventListener('keydown', function(event) {
  if (event.code === 'KeyD') {
    dodge();
  }
});
function checkWinCondition() {
  if (alienShips.length === 0) {
    // All alien ships are destroyed, player wins
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.fillText('You Win!', canvas.width / 2 - 100, canvas.height / 2);
    return true; // Indicate that the game should stop
  }
  return false; // Continue the game
}

function updateGameState() {
  updatePlayer();
  updateLasers();
  updateAlienShips();
  checkCollisions();
  if (checkWinCondition()) {
    return; // Stop the game loop if the win condition is met
  }
}

// Modify the game loop to stop when the win condition is met
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateGameState();
  renderGameState();
  if (!checkWinCondition()) {
    requestAnimationFrame(gameLoop);
  }
}
function checkLoseCondition() {
  for (const alienShip of alienShips) {
    if (alienShip.y + alienShip.height >= canvas.height) {
      // An alien ship has reached the base, player loses
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'red';
      ctx.font = '48px sans-serif';
      ctx.fillText('You Lose!', canvas.width / 2 - 100, canvas.height / 2);
      return true; // Indicate that the game should stop
    }
  }
  return false; // Continue the game
}

function updateGameState() {
  updatePlayer();
  updateLasers();
  updateAlienShips();
  checkCollisions();
  if (checkWinCondition() || checkLoseCondition()) {
    return; // Stop the game loop if the win or lose condition is met
  }
}

// Modify the game loop to stop when the win or lose condition is met
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateGameState();
  renderGameState();
  if (!checkWinCondition() && !checkLoseCondition()) {
    requestAnimationFrame(gameLoop);
  }
}
function displayOutcomeText(text, color) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = '48px sans-serif';
  ctx.fillText(text, canvas.width / 2 - 100, canvas.height / 2);
}

function checkWinCondition() {
  if (alienShips.length === 0) {
    displayOutcomeText('You Win!', 'white');
    return true; // Indicate that the game should stop
  }
  return false; // Continue the game
}

function checkLoseCondition() {
  for (const alienShip of alienShips) {
    if (alienShip.y + alienShip.height >= canvas.height) {
      displayOutcomeText('You Lose!', 'red');
      return true; // Indicate that the game should stop
    }
  }
  return false; // Continue the game
}
`;
    sharedState.stepCode = '';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'realworld-test' });
    // DEBUG: Log the cleaned output to help diagnose test failure
    // eslint-disable-next-line no-console
    console.log('--- Cleaned output for real-world test ---\n' + result + '\n--- END CLEANED OUTPUT ---');

    // AST-based validation: All variable declarations must come before any top-level function call
    const ast = parser.parse(result, { sourceType: 'module' });
    let lastVarDeclIdx = -1;
    let firstFuncCallIdx = -1;
    ast.program.body.forEach((node, idx) => {
      if (node.type === 'VariableDeclaration') lastVarDeclIdx = idx;
      if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'CallExpression' &&
        ((node.expression.callee.type === 'Identifier') || (node.expression.callee.type === 'MemberExpression')) &&
        firstFuncCallIdx === -1
      ) {
        firstFuncCallIdx = idx;
      }
    });
    expect(lastVarDeclIdx).toBeGreaterThan(-1);
    expect(firstFuncCallIdx).toBeGreaterThan(-1);
    expect(lastVarDeclIdx).toBeLessThan(firstFuncCallIdx);

    // Find all declared function names
    const declaredFunctionNames = new Set();
    ast.program.body.forEach(node => {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
        declaredFunctionNames.add(node.id.name);
      }
    });
    // Find all top-level function calls
    const callNodes = ast.program.body.filter(node =>
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'CallExpression'
    );
    // Print all top-level call names for debug
    // eslint-disable-next-line no-console
    console.log('Top-level calls:', callNodes.map(n => n.expression.callee.type === 'Identifier' ? n.expression.callee.name : '[non-identifier]'));
    // Find the last top-level call to a declared function (entrypoint candidate)
    let lastEntrypointIdx = -1;
    for (let i = callNodes.length - 1; i >= 0; i--) {
      const call = callNodes[i];
      if (
        call.expression.callee.type === 'Identifier' &&
        declaredFunctionNames.has(call.expression.callee.name)
      ) {
        lastEntrypointIdx = i;
        break;
      }
    }
    expect(lastEntrypointIdx).not.toBe(-1);
    // The last entrypoint call must be the last top-level function call
    expect(lastEntrypointIdx).toBe(callNodes.length - 1);
  });
  it('should hoist variable declarations above entrypoint calls (TDZ prevention)', async () => {
    const sharedState = createSharedState();
    // Simulate problematic input: call before declaration
    sharedState.currentCode = `
      gameLoop();
    `;
    sharedState.stepCode = `
      const player = { x: 0, y: 0 };
      function gameLoop() {
        player.x += 1;
      }
    `;
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'tdz-test' });

    // player must be declared before gameLoop is called
    const playerIndex = result.indexOf('const player');
    const callIndex = result.indexOf('gameLoop();');
    expect(playerIndex).toBeGreaterThan(-1);
    expect(callIndex).toBeGreaterThan(-1);
    expect(playerIndex).toBeLessThan(callIndex);

    // Optionally: call to gameLoop should be at the end
    expect(result.trim().endsWith('gameLoop();')).toBe(true);
  });
  const traceId = 'unit-test';

  it('should merge new code into existing code', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      function update() {
        // existing logic
      }
    `;
    sharedState.stepCode = `
      function update() {
        // new logic
        player.x += 1;
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    expect(result).toContain('player.x += 1');
    expect(result).toContain('// existing logic');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle empty currentCode', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = '';
    sharedState.stepCode = `
      function update() {
        player.x += 1;
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    expect(result).toContain('player.x += 1');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle empty stepCode', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      function update() {
        // existing logic
      }
    `;
    sharedState.stepCode = '';

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    expect(result).toContain('// existing logic');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should format merged code using prettier', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      function update() {
        // existing logic
      }
    `;
    sharedState.stepCode = `
      function update() {
        player.x += 1;
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    // Check for prettier formatting (no extra spaces, consistent indentation)
    expect(result).not.toMatch(/\n\s{3,}/); // No more than 2 spaces for indentation
    expect(result).not.toMatch(/\s{2,}\n/); // No trailing spaces
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle syntax errors gracefully', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      function update() {
        // existing logic
      }
    `;
    sharedState.stepCode = `
      function update() {
        player.x += // syntax error
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    // Should fall back to simple concatenation
    expect(result).toContain('// existing logic');
    expect(result).toContain('player.x += // syntax error');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should preserve function declarations', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      function update() {
        // existing logic
      }
      function render() {
        // render logic
      }
    `;
    sharedState.stepCode = `
      function update() {
        // new logic
        player.x += 1;
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    expect(result).toContain('function update()');
    expect(result).toContain('function render()');
    expect(result).toContain('player.x += 1');
    expect(result).toContain('// render logic');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should handle variable declarations correctly (AST)', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = `
      const player = { x: 0, y: 0 };
      function update() {
        // existing logic
      }
    `;
    sharedState.stepCode = `
      const speed = 5;
      function update() {
        player.x += speed;
      }
    `;

    const result = await BlockInserterAgent(sharedState, { logger, traceId });

    const ast = parser.parse(result, { sourceType: 'module' });
    const declarations = extractDeclarations(ast);

    // Check for player variable
    expect(
      declarations.some(
        node =>
          node.type === 'VariableDeclaration' &&
          node.declarations.some(decl => decl.id.name === 'player')
      )
    ).toBe(true);

    // Check for speed variable
    expect(
      declarations.some(
        node =>
          node.type === 'VariableDeclaration' &&
          node.declarations.some(decl => decl.id.name === 'speed')
      )
    ).toBe(true);

    // Check for update function
    expect(
      declarations.some(
        node =>
          node.type === 'FunctionDeclaration' &&
          node.id.name === 'update'
      )
    ).toBe(true);

    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should return a string (new currentCode) after insertion/merge (MockOpenAI)', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = '// new logic';
    const result = await BlockInserterAgent(sharedState, { logger: logger, traceId: 'test-trace' });
    expect(typeof result).toBe('string');
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge stepCode into an existing function if names match', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() { console.log("old"); }';
    sharedState.stepCode = 'function update() { console.log("new"); }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'merge-fn' });
    // New logic: order is variable declarations, then functions (draw, then update)
    expect(result).toMatch(/function update\(\) \{[\s\S]*console\.log\("old"\);[\s\S]*console\.log\("new"\);[\s\S]*\}/);
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should append a new function if not present in currentCode', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'function draw() { console.log("draw"); }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'append-fn' });
    expect(result).toMatch(/function update\(\) \{\}[\s\S]*function draw\(\) \{[\s\S]*console\.log\("draw"\);[\s\S]*\}/);
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should append statements if stepCode is not a function', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function update() {}';
    sharedState.stepCode = 'const x = 42;';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'append-stmt' });
    expect(result).toMatch(/const x = 42;[\s\S]*function update\(\) \{\}/);
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge functions with early returns without breaking logic', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function foo() { if (a) return 1; return 2; }';
    sharedState.stepCode = 'function foo() { if (b) return 3; }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'early-return' });
    expect(result).toMatch(/function foo\(\) \{[\s\S]*if \(a\) return 1;[\s\S]*if \(b\) return 3;[\s\S]*return 2;[\s\S]*\}/);
    expect(sharedState.currentCode).toBe(result);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge functions with different control flow', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function baz() { for (let i = 0; i < 3; i++) { doA(); } }';
    sharedState.stepCode = 'function baz() { while (true) { doB(); break; } }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'control-flow' });
    const noWS = s => s.replace(/\s+/g, '');
    expect(noWS(result)).toContain(noWS('for (let i = 0; i < 3; i++) { doA(); }'));
    expect(noWS(result)).toContain(noWS('while (true) { doB(); break; }'));
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge multiple functions at once', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function a() { return 1; } function b() { return 2; }';
    sharedState.stepCode = 'function a() { doA(); } function c() { return 3; }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'multi-fn' });
    expect(result).toMatch(/function a\(\) \{[\s\S]*doA\(\);[\s\S]*return 1;[\s\S]*\}/);
    expect(result).toMatch(/function b\(\) \{[\s\S]*return 2;[\s\S]*\}/);
    expect(result).toMatch(/function c\(\) \{[\s\S]*return 3;[\s\S]*\}/);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge code with nested functions', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function outer() { function inner() { return 1; } }';
    sharedState.stepCode = 'function outer() { function inner2() { return 2; } }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'nested-fn' });
    const noWS = s => s.replace(/\s+/g, '');
    expect(noWS(result)).toContain(noWS('function inner() { return 1; }'));
    expect(noWS(result)).toContain(noWS('function inner2() { return 2; }'));
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge code with comments and formatting differences', async () => {
    const sharedState = createSharedState();
    sharedState.currentCode = 'function foo() { /* old comment */ console.log("old"); }';
    sharedState.stepCode = 'function foo() { // new comment\nconsole.log("new"); }';
    const result = await BlockInserterAgent(sharedState, { logger, traceId: 'comments' });
    expect(result).toMatch(/function foo\(\) \{[\s\S]*\/\* old comment \*\/[\s\S]*console\.log\("old"\);[\s\S]*\/\/ new comment[\s\S]*console\.log\("new"\);[\s\S]*\}/);
    expect(sharedState.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  it('should merge function bodies correctly across multiple steps', async () => {
    // Step 1: Add player movement
    const step1Code = `
      const player = { x: 0, y: 0, speed: 5 };
      function update() {
        // Player movement
        if (keys.ArrowLeft) player.x -= player.speed;
        if (keys.ArrowRight) player.x += player.speed;
      }
    `;

    // Step 2: Add coin collection
    const step2Code = `
      const coins = [];
      let score = 0;
      function update() {
        // Coin collection
        for (const coin of coins) {
          if (checkCollision(player, coin)) {
            score += 10;
            coins.splice(coins.indexOf(coin), 1);
          }
        }
      }
    `;

    // Step 3: Add collision detection
    const step3Code = `
      const gameObjects = [];
      function update() {
        // Collision detection
        for (const obj1 of gameObjects) {
          for (const obj2 of gameObjects) {
            if (obj1 !== obj2 && checkCollision(obj1, obj2)) {
              handleCollision(obj1, obj2);
            }
          }
        }
      }
    `;

    // Create sharedState once and reuse it
    const sharedState = createSharedState();
    sharedState.currentCode = '';
    sharedState.stepCode = step1Code;
    let result = await BlockInserterAgent(sharedState, { logger, traceId });

    // Merge step 2
    sharedState.currentCode = result;
    sharedState.stepCode = step2Code;
    result = await BlockInserterAgent(sharedState, { logger, traceId });

    // Merge step 3
    sharedState.currentCode = result;
    sharedState.stepCode = step3Code;
    result = await BlockInserterAgent(sharedState, { logger, traceId });

    // Parse the result to verify structure
    const ast = parser.parse(result, { sourceType: 'module' });
    const declarations = extractDeclarations(ast);

    // Verify all variables are declared
    expect(declarations.some(node => 
      node.type === 'VariableDeclaration' && 
      node.declarations.some(decl => decl.id.name === 'player')
    )).toBe(true);

    expect(declarations.some(node => 
      node.type === 'VariableDeclaration' && 
      node.declarations.some(decl => decl.id.name === 'coins')
    )).toBe(true);

    expect(declarations.some(node => 
      node.type === 'VariableDeclaration' && 
      node.declarations.some(decl => decl.id.name === 'gameObjects')
    )).toBe(true);

    // Find the update function
    const updateFunction = declarations.find(node => 
      node.type === 'FunctionDeclaration' && 
      node.id.name === 'update'
    );

    expect(updateFunction).toBeDefined();

    // Verify the update function contains all logic in the correct order
    const updateBody = updateFunction.body.body;
    const updateCode = result.slice(updateFunction.start, updateFunction.end);

    // Check for player movement
    expect(updateCode).toContain('player.x -= player.speed');
    expect(updateCode).toContain('player.x += player.speed');

    // Check for coin collection
    expect(updateCode).toContain('for (const coin of coins)');
    expect(updateCode).toContain('score += 10');

    // Check for collision detection
    expect(updateCode).toContain('for (const obj1 of gameObjects)');
    expect(updateCode).toContain('handleCollision(obj1, obj2)');

    // Verify the order of operations
    const playerMovementIndex = updateCode.indexOf('player.x -= player.speed');
    const coinCollectionIndex = updateCode.indexOf('for (const coin of coins)');
    const collisionDetectionIndex = updateCode.indexOf('for (const obj1 of gameObjects)');

    expect(playerMovementIndex).toBeLessThan(coinCollectionIndex);
    expect(coinCollectionIndex).toBeLessThan(collisionDetectionIndex);
  });

  // Placeholder for real LLM test
  // (useRealLLM ? it : it.skip)('should return a valid code merge from real OpenAI', async () => {
  //   // To be implemented if BlockInserterAgent becomes LLM-driven
  //   expect(true).toBe(true);
  // });
}); 