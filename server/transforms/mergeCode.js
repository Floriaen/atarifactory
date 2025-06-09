const recast = require('recast');
const { namedTypes: t } = require('ast-types');

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
      type: 'CommentBlock',
      value: ' Merged function body ',
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

function mergeCode(currentCode, stepCode) {
  try {
    // Parse both code blocks
    const currentAST = parse(currentCode);
    const stepAST = parse(stepCode);

    // Handle syntax errors in either block
    if (!currentAST || !stepAST) {
      return currentCode + '\n' + stepCode;
    }

    // Merge the ASTs
    const mergedAST = mergeASTs(currentAST, stepAST);

    // Generate code from merged AST with double quotes
    const mergedCode = generate(mergedAST, {
      quotes: 'double',
      retainLines: true,
      compact: false
    }).code;

    return mergedCode;
  } catch (error) {
    // If any error occurs during AST manipulation, fall back to simple concatenation
    return currentCode + '\n' + stepCode;
  }
}

// Update mergeASTs to collect all function declarations with the same name, then merge all of them into a single declaration per name using mergeFunctionDeclarations in a reducer loop.
function mergeASTs(currentAST, stepAST) {
  const t = require('@babel/types');

  // Collect all top-level statements
  const allStatements = [...currentAST.program.body, ...stepAST.program.body];

  // Maps for deduplication
  const funcMap = new Map(); // name -> array of decls
  const varMap = new Map();
  const otherStatements = [];

  for (const stmt of allStatements) {
    if (t.isFunctionDeclaration(stmt) && stmt.id && stmt.id.name) {
      const name = stmt.id.name;
      if (!funcMap.has(name)) {
        funcMap.set(name, []);
      }
      funcMap.get(name).push(stmt);
    } else if (t.isVariableDeclaration(stmt)) {
      // Deduplicate variable declarations by name
      for (const decl of stmt.declarations) {
        if (t.isIdentifier(decl.id)) {
          varMap.set(decl.id.name, stmt);
        }
      }
    } else {
      otherStatements.push(stmt);
    }
  }

  // Merge all function declarations with the same name
  const mergedFuncs = [];
  for (const [name, decls] of funcMap.entries()) {
    const merged = decls.reduce((a, b) => mergeFunctionDeclarations(a, b));
    mergedFuncs.push(merged);
  }

  // Compose final body: variables, functions, others
  let mergedBody = [
    ...Array.from(varMap.values()),
    ...mergedFuncs,
    ...otherStatements,
  ];

  // Remove duplicate function declarations by name (keep first occurrence, anywhere in mergedBody)
  const seenFuncNames = new Set();
  mergedBody = mergedBody.filter(stmt => {
    if (t.isFunctionDeclaration(stmt) && stmt.id && stmt.id.name) {
      if (seenFuncNames.has(stmt.id.name)) {
        return false;
      }
      seenFuncNames.add(stmt.id.name);
    }
    return true;
  });

  return {
    type: 'File',
    program: {
      type: 'Program',
      body: mergedBody,
      sourceType: 'module',
    },
  };
} 