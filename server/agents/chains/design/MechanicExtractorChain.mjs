import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, '../../prompts/design/mechanic-extractor.md');

function createMechanicExtractorChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['loop'],
    schemaName: 'mechanics array',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createMechanicExtractorChain };