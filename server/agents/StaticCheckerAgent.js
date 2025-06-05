const parser = require('@babel/parser');

// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

/**
 * StaticCheckerAgent
 * Input: {
 *   currentCode: string,
 *   stepCode: string
 * }
 * Output: Array<string> (list of errors: duplicate declarations, undeclared variables, syntax issues)
 *
 * Performs static analysis on the code.
 */
function StaticCheckerAgent({ currentCode, stepCode }, { logger, traceId }) {
  logger.info('StaticCheckerAgent called', { traceId });
  const errors = [];
  const code = currentCode + '\n' + stepCode;
  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'script', ecmaVersion: 'latest' });
  } catch (err) {
    errors.push('Syntax error: ' + err.message);
    return errors;
  }
  // Collect declared variables/functions and check for duplicates
  const declared = new Set();
  const duplicates = new Set();
  const undeclared = new Set();
  const scopeStack = [{}];
  function declare(name) {
    if (declared.has(name)) {
      duplicates.add(name);
    } else {
      declared.add(name);
      scopeStack[scopeStack.length - 1][name] = true;
    }
  }
  function isDeclared(name) {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i][name]) return true;
    }
    return false;
  }
  const { types: t } = require('@babel/core') || {};
  const traverse = require('@babel/traverse').default || require('@babel/traverse');
  // Fallback: manual traversal
  function walk(node) {
    if (!node) return;
    switch (node.type) {
      case 'VariableDeclaration':
        for (const decl of node.declarations) {
          if (decl.id && decl.id.name) declare(decl.id.name);
        }
        break;
      case 'FunctionDeclaration':
        if (node.id && node.id.name) declare(node.id.name);
        scopeStack.push({});
        for (const param of node.params) {
          if (param.type === 'Identifier') declare(param.name);
        }
        walk(node.body);
        scopeStack.pop();
        break;
      case 'BlockStatement':
        scopeStack.push({});
        for (const stmt of node.body) walk(stmt);
        scopeStack.pop();
        break;
      case 'Identifier':
        if (!isDeclared(node.name)) undeclared.add(node.name);
        break;
      case 'ExpressionStatement':
        walk(node.expression);
        break;
      case 'CallExpression':
        walk(node.callee);
        for (const arg of node.arguments) walk(arg);
        break;
      case 'BinaryExpression':
      case 'LogicalExpression':
        walk(node.left);
        walk(node.right);
        break;
      case 'AssignmentExpression':
        walk(node.left);
        walk(node.right);
        break;
      case 'ReturnStatement':
        walk(node.argument);
        break;
      case 'IfStatement':
        walk(node.test);
        walk(node.consequent);
        if (node.alternate) walk(node.alternate);
        break;
      case 'ForStatement':
        walk(node.init);
        walk(node.test);
        walk(node.update);
        walk(node.body);
        break;
      case 'WhileStatement':
        walk(node.test);
        walk(node.body);
        break;
      case 'MemberExpression':
        walk(node.object);
        if (node.property && node.property.type !== 'Identifier') walk(node.property);
        break;
      default:
        // Recursively walk all child nodes
        for (const key in node) {
          if (Array.isArray(node[key])) {
            for (const child of node[key]) if (child && typeof child.type === 'string') walk(child);
          } else if (node[key] && typeof node[key] === 'object' && node[key].type) {
            walk(node[key]);
          }
        }
    }
  }
  walk(ast.program);
  if (duplicates.size > 0) {
    for (const name of duplicates) errors.push(`Duplicate declaration: ${name}`);
  }
  if (undeclared.size > 0) {
    for (const name of undeclared) errors.push(`Undeclared variable: ${name}`);
  }
  return errors;
}

module.exports = StaticCheckerAgent; 