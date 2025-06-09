const recast = require('recast');
const { namedTypes: t } = require('ast-types');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const prettier = require('prettier');

module.exports = function(fileInfo, api, options) {
  const j = api.jscodeshift;
  const { stepCode, currentAST, stepAST } = options;
  
  // Get the root nodes from both ASTs
  const currentRoot = currentAST.program;
  const stepRoot = stepAST.program;
  
  // Create a new program node to hold the merged code
  const mergedProgram = j.program([]);
  
  // Helper function to merge function declarations
  function mergeFunctionDeclarations(currentFunc, stepFunc) {
    if (!currentFunc) return stepFunc;
    if (!stepFunc) return currentFunc;

    const currentBody = currentFunc.body.body;
    const stepBody = stepFunc.body.body;

    // Separate variable declarations
    const currentVars = currentBody.filter(stmt => stmt.type === 'VariableDeclaration');
    const stepVars = stepBody.filter(stmt => stmt.type === 'VariableDeclaration');
    // Merge variable declarations, avoiding duplicates
    const mergedVars = [...currentVars];
    for (const stepVar of stepVars) {
      const isDuplicate = mergedVars.some(currentVar =>
        currentVar.declarations.some(d =>
          stepVar.declarations.some(sd => sd.id.name === d.id.name)
        )
      );
      if (!isDuplicate) {
        mergedVars.push(stepVar);
      }
    }

    // Merge statements: collect all if-return and unconditional returns
    const allStmts = [
      ...currentBody.filter(stmt => stmt.type !== 'VariableDeclaration'),
      ...stepBody.filter(stmt => stmt.type !== 'VariableDeclaration'),
    ];

    // Helper to stringify a node for deduplication
    function nodeToString(node) {
      try {
        return generate({ type: 'Program', body: [node] }).code;
      } catch {
        return JSON.stringify(node);
      }
    }

    // Deduplicate by stringified code
    const seen = new Set();
    const ifReturns = [];
    let finalReturn = null;
    const others = [];

    for (const stmt of allStmts) {
      const str = nodeToString(stmt);
      if (seen.has(str)) continue;
      seen.add(str);
      if (
        stmt.type === 'IfStatement' &&
        stmt.consequent &&
        stmt.consequent.type === 'BlockStatement' &&
        stmt.consequent.body.length === 1 &&
        stmt.consequent.body[0].type === 'ReturnStatement'
      ) {
        ifReturns.push(stmt);
      } else if (stmt.type === 'ReturnStatement') {
        finalReturn = stmt; // last unconditional return wins
      } else {
        others.push(stmt);
      }
    }

    // Compose merged body: variables, if-returns, others, final return
    const mergedBody = [
      ...mergedVars,
      ...ifReturns,
      ...others,
    ];
    if (finalReturn) mergedBody.push(finalReturn);

    const mergedFunc = {
      ...currentFunc,
      body: {
        ...currentFunc.body,
        body: mergedBody,
      },
    };

    // Merge comments
    if (currentFunc.comments) {
      mergedFunc.comments = [...currentFunc.comments];
    }
    if (stepFunc.comments) {
      mergedFunc.comments = [...(mergedFunc.comments || []), ...stepFunc.comments];
    }
    if (!mergedFunc.comments) {
      mergedFunc.comments = [];
    }
    mergedFunc.comments.push({
      type: 'CommentLine',
      value: ' existing logic ',
      start: mergedFunc.start,
      end: mergedFunc.end,
    });

    return mergedFunc;
  }

  function isControlFlow(node) {
    return node.type === 'IfStatement' ||
           node.type === 'ForStatement' ||
           node.type === 'WhileStatement' ||
           node.type === 'DoWhileStatement' ||
           node.type === 'SwitchStatement' ||
           node.type === 'TryStatement';
  }
  
  // Helper function to merge variable declarations
  function mergeVariableDeclarations(currentVars, stepVars) {
    if (!currentVars || !stepVars) return currentVars || stepVars;
    
    // Create a new variable declaration
    const mergedVars = j.variableDeclaration(
      currentVars.kind,
      [
        ...currentVars.declarations,
        ...stepVars.declarations
      ]
    );
    
    // Copy comments
    mergedVars.comments = [
      ...(currentVars.comments || []),
      ...(stepVars.comments || [])
    ];
    
    return mergedVars;
  }
  
  // Process all declarations in both ASTs
  const currentDeclarations = new Map();
  const stepDeclarations = new Map();
  
  // Collect declarations from current code
  currentRoot.body.forEach(node => {
    if (t.FunctionDeclaration.check(node)) {
      currentDeclarations.set(node.id.name, node);
    } else if (t.VariableDeclaration.check(node)) {
      node.declarations.forEach(decl => {
        if (t.Identifier.check(decl.id)) {
          currentDeclarations.set(decl.id.name, node);
        }
      });
    }
  });
  
  // Collect declarations from step code
  stepRoot.body.forEach(node => {
    if (t.FunctionDeclaration.check(node)) {
      stepDeclarations.set(node.id.name, node);
    } else if (t.VariableDeclaration.check(node)) {
      node.declarations.forEach(decl => {
        if (t.Identifier.check(decl.id)) {
          stepDeclarations.set(decl.id.name, node);
        }
      });
    }
  });
  
  // Merge declarations
  const allDeclarations = new Set([
    ...currentDeclarations.keys(),
    ...stepDeclarations.keys()
  ]);
  
  allDeclarations.forEach(name => {
    const currentDecl = currentDeclarations.get(name);
    const stepDecl = stepDeclarations.get(name);
    
    if (t.FunctionDeclaration.check(currentDecl) && t.FunctionDeclaration.check(stepDecl)) {
      mergedProgram.body.push(mergeFunctionDeclarations(currentDecl, stepDecl));
    } else if (t.VariableDeclaration.check(currentDecl) && t.VariableDeclaration.check(stepDecl)) {
      mergedProgram.body.push(mergeVariableDeclarations(currentDecl, stepDecl));
    } else {
      // If only one exists, use that one
      mergedProgram.body.push(currentDecl || stepDecl);
    }
  });
  
  // Add any remaining nodes that weren't declarations
  currentRoot.body.forEach(node => {
    if (!t.FunctionDeclaration.check(node) && !t.VariableDeclaration.check(node)) {
      mergedProgram.body.push(node);
    }
  });
  
  stepRoot.body.forEach(node => {
    if (!t.FunctionDeclaration.check(node) && !t.VariableDeclaration.check(node)) {
      mergedProgram.body.push(node);
    }
  });
  
  // Convert the merged AST back to code
  return recast.print(mergedProgram).code;
};

function mergeFunctionBodies(fnA, fnB) {
  // Merge the bodies by concatenating the statements, preserving comments
  const cloneDeep = obj => JSON.parse(JSON.stringify(obj));
  const bodyA = fnA.body.body || [];
  const bodyB = fnB.body.body || [];

  // Preserve comments from both function bodies
  let mergedBody = [...bodyA, ...bodyB];

  // Attach leading comments from both function declarations
  let leadingComments = [];
  if (fnA.leadingComments) leadingComments = leadingComments.concat(cloneDeep(fnA.leadingComments));
  if (fnB.leadingComments) leadingComments = leadingComments.concat(cloneDeep(fnB.leadingComments));

  const mergedFn = {
    ...fnA,
    body: {
      ...fnA.body,
      body: mergedBody,
    },
  };
  if (leadingComments.length > 0) {
    mergedFn.leadingComments = leadingComments;
  }
  return mergedFn;
}

function mergeCode(currentCode, stepCode) {
  const astA = parser.parse(currentCode, { sourceType: 'module' });
  const astB = parser.parse(stepCode, { sourceType: 'module' });

  // Collect function declarations by name
  const fnMap = new Map();
  const otherNodes = [];

  // Helper to collect functions and other nodes
  function collect(ast, isStep) {
    for (const node of ast.program.body) {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
        if (fnMap.has(node.id.name)) {
          if (isStep) {
            // Merge bodies if function exists in both
            const merged = mergeFunctionBodies(fnMap.get(node.id.name), node);
            fnMap.set(node.id.name, merged);
          }
        } else {
          fnMap.set(node.id.name, node);
        }
      } else {
        otherNodes.push(node);
      }
    }
  }

  collect(astA, false);
  collect(astB, true);

  // Rebuild the merged AST
  const mergedBody = [...fnMap.values(), ...otherNodes];
  const mergedAst = {
    type: 'File',
    program: {
      type: 'Program',
      body: mergedBody,
      sourceType: 'module',
    },
  };

  let code = generate(mergedAst).code;
  try {
    code = prettier.format(code, { parser: 'babel' });
  } catch (e) {
    // Fallback: return unformatted code
  }
  return code;
} 