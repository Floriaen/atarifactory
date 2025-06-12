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
    expect(result).toMatch(/function update\(\) \{\}[\s\S]*const x = 42;/);
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