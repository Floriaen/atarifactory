import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/playability-heuristic.md');

function createPlayabilityHeuristicChain(llm) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['gameDef'],
    schemaName: 'playabilityScore and rationale'
  });
}

export { createPlayabilityHeuristicChain };
