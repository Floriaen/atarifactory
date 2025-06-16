const { cleanUp } = require('../../utils/cleanUp');
const parser = require('@babel/parser');

describe('cleanUp - High Level LLM-Generated Code Robustness', () => {
  it('removes duplicate function declarations and keeps only one per name', () => {
    const messy = `
function foo() { console.log('A'); }
function foo() { console.log('B'); }
function foo() { console.log('C'); }
foo();
foo();
`;
    const cleaned = cleanUp(messy);
    const ast = parser.parse(cleaned, { sourceType: 'module' });
    // Only one foo declaration
    const fooDecls = ast.program.body.filter(
      n => n.type === 'FunctionDeclaration' && n.id.name === 'foo'
    );
    expect(fooDecls.length).toBe(1);
    // Only one foo() call
    const fooCalls = ast.program.body.filter(
      n => n.type === 'ExpressionStatement' &&
        n.expression.type === 'CallExpression' &&
        n.expression.callee.type === 'Identifier' &&
        n.expression.callee.name === 'foo'
    );
    expect(fooCalls.length).toBe(1);
  });

  it('hoists all declarations before any calls and only one entrypoint call remains', () => {
    const messy = `
foo();
bar();
const x = 1;
function foo() { return x; }
function bar() { return foo(); }
foo();
bar();
`;
    const cleaned = cleanUp(messy);
    const ast = parser.parse(cleaned, { sourceType: 'module' });
    // All declarations before any call
    let seenCall = false;
    for (const node of ast.program.body) {
      if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
        seenCall = true;
      } else if ((node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration') && seenCall) {
        throw new Error('Declaration after call!');
      }
    }
    // Only one call per entrypoint
    const fooCalls = ast.program.body.filter(
      n => n.type === 'ExpressionStatement' &&
        n.expression.type === 'CallExpression' &&
        n.expression.callee.type === 'Identifier' &&
        n.expression.callee.name === 'foo'
    );
    const barCalls = ast.program.body.filter(
      n => n.type === 'ExpressionStatement' &&
        n.expression.type === 'CallExpression' &&
        n.expression.callee.type === 'Identifier' &&
        n.expression.callee.name === 'bar'
    );
    expect(fooCalls.length).toBe(1);
    expect(barCalls.length).toBe(1);
  });

  it('handles realistic LLM output: merges, deduplicates, and orders correctly', () => {
    const messy = `
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
function gameLoop() { ctx.clearRect(0,0,canvas.width,canvas.height); }
gameLoop();
const player = { x: 0, y: 0 };
function gameLoop() { ctx.clearRect(0,0,canvas.width,canvas.height); updateGameState(); renderGameState(); requestAnimationFrame(gameLoop); }
gameLoop();
function updateGameState() { /* ... */ }
function renderGameState() { /* ... */ }
`;
    const cleaned = cleanUp(messy);
    const ast = parser.parse(cleaned, { sourceType: 'module' });
    // Only one gameLoop declaration
    const gameLoopDecls = ast.program.body.filter(
      n => n.type === 'FunctionDeclaration' && n.id.name === 'gameLoop'
    );
    expect(gameLoopDecls.length).toBe(1);
    // Only one gameLoop call, and it's last
    const calls = ast.program.body.filter(
      n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression'
    );
    const lastCall = calls[calls.length - 1];
    expect(
      lastCall &&
      lastCall.expression.callee.type === 'Identifier' &&
      lastCall.expression.callee.name === 'gameLoop'
    ).toBe(true);
    // All declarations before calls
    let seenCall = false;
    for (const node of ast.program.body) {
      if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
        seenCall = true;
      } else if ((node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration') && seenCall) {
        throw new Error('Declaration after call!');
      }
    }
  });

    // --- Add this after the describe block, not inside it ---
    it('removes all but one declaration for each function name in realistic merged output', () => {
        const messy = `
    function gameLoop() { /* v1 */ }
    function gameLoop() { /* v2 */ }
    function gameLoop() { /* v3 */ }
    function updatePlayerPosition() { /* v1 */ }
    function updatePlayerPosition() { /* v2 */ }
    function checkTrapCollision() { /* v1 */ }
    function checkTrapCollision() { /* v2 */ }
    function checkWinCondition() { /* v1 */ }
    function checkWinCondition() { /* v2 */ }
    `;
        const cleaned = cleanUp(messy);
        const ast = parser.parse(cleaned, { sourceType: 'module' });
        const fnNames = ['gameLoop', 'updatePlayerPosition', 'checkTrapCollision', 'checkWinCondition'];
        for (const name of fnNames) {
        const decls = ast.program.body.filter(
            n => n.type === 'FunctionDeclaration' && n.id.name === name
        );
        expect(decls.length).toBe(1);
        }
    });
});
