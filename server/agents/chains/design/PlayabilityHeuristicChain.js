import { createValidationChain } from '../../../utils/chainFactory.js';
import { playabilityHeuristicSchema } from '../../../schemas/langchain-schemas.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/playability-heuristic.md');

async function createPlayabilityHeuristicChain(llm, options = {}) {
  return createValidationChain({
    chainName: 'PlayabilityHeuristicChain',
    promptFile: 'design/playability-heuristic.md',
    inputVariables: ['gameDef'],
    schema: playabilityHeuristicSchema,
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createPlayabilityHeuristicChain };
