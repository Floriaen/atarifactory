const recast = require('recast');
const prettier = require('prettier');

/**
 * BlockInserterAgent
 * Input: {
 *   currentCode: string,
 *   stepCode: string
 * }
 * Output: string (new currentCode after safe insertion/merge)
 *
 * Uses AST-based code manipulation to insert/merge stepCode into currentCode.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.
function BlockInserterAgent({ currentCode, stepCode }, { logger, traceId }) {
  logger.info('BlockInserterAgent called', { traceId });
  try {
    // Parse current code and step code into ASTs
    const currentAst = recast.parse(currentCode);
    const stepAst = recast.parse(stepCode);
    // Find the first function declaration in stepCode
    let inserted = false;
    recast.types.visit(stepAst, {
      visitFunctionDeclaration(path) {
        const funcName = path.node.id.name;
        // Try to find a matching function in currentCode
        let found = false;
        recast.types.visit(currentAst, {
          visitFunctionDeclaration(currentPath) {
            if (currentPath.node.id.name === funcName) {
              // Insert step function body statements at the top of the function
              currentPath.node.body.body = [
                ...path.node.body.body,
                ...currentPath.node.body.body
              ];
              found = true;
              inserted = true;
              return false;
            }
            this.traverse(currentPath);
          }
        });
        // If not found, append the function to the program
        if (!found) {
          currentAst.program.body.push(path.node);
          inserted = true;
        }
        return false;
      }
    });
    // If no function found in stepCode, just append the code
    if (!inserted) {
      currentAst.program.body.push(...stepAst.program.body);
    }
    // Print and format the merged code
    const merged = recast.print(currentAst).code;
    const formatted = prettier.format(merged, { parser: 'babel' });
    return formatted;
  } catch (err) {
    logger.error('BlockInserterAgent error', { traceId, error: err });
    // Fallback: concatenate
    return currentCode + '\n' + stepCode;
  }
}

module.exports = BlockInserterAgent; 