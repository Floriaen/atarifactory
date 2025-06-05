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
    const currentAst = recast.parse(currentCode);
    const stepAst = recast.parse(stepCode);
    let inserted = false;
    recast.types.visit(stepAst, {
      visitFunctionDeclaration(path) {
        const funcName = path.node.id.name;
        let found = false;
        recast.types.visit(currentAst, {
          visitFunctionDeclaration(currentPath) {
            if (currentPath.node.id.name === funcName) {
              // --- Smarter merge: append only new statements, deduplicate ---
              const existingBody = currentPath.node.body.body;
              const newBody = path.node.body.body;
              // Deduplicate: only add statements not already present (by string)
              const existingStrs = new Set(existingBody.map(stmt => recast.print(stmt).code.trim()));
              const toAdd = newBody.filter(stmt => !existingStrs.has(recast.print(stmt).code.trim()));
              currentPath.node.body.body = [
                ...existingBody,
                ...toAdd
              ];
              found = true;
              inserted = true;
              return false;
            }
            this.traverse(currentPath);
          }
        });
        if (!found) {
          currentAst.program.body.push(path.node);
          inserted = true;
        }
        return false;
      }
    });
    if (!inserted) {
      currentAst.program.body.push(...stepAst.program.body);
    }
    const merged = recast.print(currentAst).code;
    const formatted = prettier.format(merged, { parser: 'babel' });
    return formatted;
  } catch (err) {
    logger.error('BlockInserterAgent error', { traceId, error: err });
    return currentCode + '\n' + stepCode;
  }
}

module.exports = BlockInserterAgent; 