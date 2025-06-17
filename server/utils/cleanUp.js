// cleanUp.js
// AST-based code deduplication and hoisting utility for generated game code
// Ensures all variables/functions are declared once, at the top, and only one main game loop exists.

const recast = require('recast');

function cleanUp(jsCode) {
  const recast = require('recast');
  const b = recast.types.builders;
  const ast = recast.parse(jsCode);

  // Deduplication maps
  const varDecls = new Map(); // variable name -> VariableDeclaration node
  const funcDecls = new Map(); // function name -> FunctionDeclaration node
  const functionCalls = new Map(); // callee name -> ExpressionStatement node (last occurrence)
  const others = [];

  // Helper: extract callee name from CallExpression
  function getCalleeName(expr) {
    if (expr.callee.type === 'Identifier') {
      return expr.callee.name;
    } else if (expr.callee.type === 'MemberExpression') {
      let objectName = expr.callee.object.name || '';
      let propertyName = expr.callee.property.name || '';
      return objectName && propertyName ? `${objectName}.${propertyName}` : '';
    }
    return '';
  }

  // First pass: collect all function declaration names
  const declaredFunctionNames = new Set();
  ast.program.body.forEach(node => {
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
      declaredFunctionNames.add(node.id.name);
    }
  });

  // Second pass: classify nodes
  ast.program.body.forEach(node => {
    if (node.type === 'VariableDeclaration') {
      // Split multi-variable declarations for robust hoisting
      node.declarations.forEach(decl => {
        if (!varDecls.has(decl.id.name)) {
          varDecls.set(
            decl.id.name,
            b.variableDeclaration(node.kind, [decl])
          );
        }
      });
    } else if (node.type === 'FunctionDeclaration') {
      if (!funcDecls.has(node.id.name)) {
        funcDecls.set(node.id.name, node);
      }
    } else if (
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'CallExpression'
    ) {
      const calleeName = getCalleeName(node.expression);
      if (calleeName) {
        functionCalls.set(calleeName, node); // Last occurrence wins
      } else {
        others.push(node);
      }
    } else {
      others.push(node);
    }
  });

  // Partition calls: entrypoint = call to declared function, others = all else
  const entrypointCalls = [];
  const nonEntrypointCalls = [];
  for (const [calleeName, node] of functionCalls.entries()) {
    // Only consider Identifier callees as entrypoints
    if (
      node.expression.callee.type === 'Identifier' &&
      declaredFunctionNames.has(node.expression.callee.name)
    ) {
      entrypointCalls.push(node);
    } else {
      nonEntrypointCalls.push(node);
    }
  }

  // Compose final AST: declarations, others, non-entrypoint calls, entrypoint calls (last)
  ast.program.body = [
    ...varDecls.values(),
    ...funcDecls.values(),
    ...others,
    ...nonEntrypointCalls,
    ...entrypointCalls
  ];

  return recast.print(ast).code;
}


module.exports = { cleanUp };
