const { mergeCode: astMerge } = require('ast-merge');

/**
 * Merges two pieces of code using AST-based merging
 * @param {string} currentCode - The current code
 * @param {string} stepCode - The code to merge in
 * @param {string} language - The language of the code (default: 'js')
 * @returns {Promise<string>} The merged code
 */
async function mergeCode(currentCode, stepCode, language = 'js') {
  try {
    // Extract functions from both codes
    const currentFunctions = extractFunctions(currentCode);
    const stepFunctions = extractFunctions(stepCode);
    
    // Merge functions with the same name
    for (const [name, stepFunc] of stepFunctions) {
      if (currentFunctions.has(name)) {
        // Merge function bodies
        const currentFunc = currentFunctions.get(name);
        const mergedBody = mergeFunctionBodies(currentFunc.body, stepFunc.body);
        currentFunctions.set(name, {
          name,
          body: mergedBody,
          toString() {
            return `function ${name}() {${this.body}}`;
          }
        });
      } else {
        // Add new function
        currentFunctions.set(name, stepFunc);
      }
    }
    
    // Convert functions back to code
    const mergedFunctions = Array.from(currentFunctions.values())
      .map(f => f.toString())
      .join('\n\n');
    
    // Merge any remaining code using ast-merge
    const nonFunctionCode = currentCode.replace(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g, '').trim();
    const nonFunctionStepCode = stepCode.replace(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g, '').trim();
    
    let mergedNonFunctionCode = '';
    if (nonFunctionCode || nonFunctionStepCode) {
      const merged = await astMerge(nonFunctionCode, nonFunctionStepCode, language);
      mergedNonFunctionCode = typeof merged === 'string' ? merged : String(merged);
    }
    
    // Combine merged functions and non-function code
    const finalCode = [mergedFunctions, mergedNonFunctionCode]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    
    return finalCode;
  } catch (error) {
    console.error('Error merging code:', error);
    throw error;
  }
}

/**
 * Extracts functions from code
 * @param {string} code - The code to extract functions from
 * @returns {Map<string, Function>} Map of function names to function objects
 */
function extractFunctions(code) {
  const functions = new Map();
  const funcRegex = /function\s+(\w+)\s*\([^)]*\)\s*{([^}]*)}/g;
  let match;
  
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2];
    functions.set(name, {
      name,
      body,
      toString() {
        return `function ${name}() {${this.body}}`;
      }
    });
  }
  
  return functions;
}

/**
 * Merges two function bodies
 * @param {string} body1 - First function body
 * @param {string} body2 - Second function body
 * @returns {string} Merged function body
 */
function mergeFunctionBodies(body1, body2) {
  // Split bodies into statements
  const statements1 = body1.split(';').map(s => s.trim()).filter(Boolean);
  const statements2 = body2.split(';').map(s => s.trim()).filter(Boolean);
  
  // Separate return statements
  const returns1 = statements1.filter(s => s.startsWith('return'));
  const returns2 = statements2.filter(s => s.startsWith('return'));
  const nonReturns1 = statements1.filter(s => !s.startsWith('return'));
  const nonReturns2 = statements2.filter(s => !s.startsWith('return'));
  
  // Combine non-return statements first
  const combinedStatements = [...nonReturns1, ...nonReturns2];
  
  // Add return statements at the end, preserving the last one from body1
  const allReturns = [...returns1, ...returns2];
  if (allReturns.length > 0) {
    combinedStatements.push(allReturns[allReturns.length - 1]);
  }
  
  // Join statements with semicolons
  return combinedStatements.join(';\n') + ';';
}

module.exports = {
  mergeCode
}; 