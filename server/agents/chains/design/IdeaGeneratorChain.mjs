import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptPath = path.join(__dirname, '../../prompts/design/idea-generator.md');

function createIdeaGeneratorChain(llm, options = {}) {
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['constraints'],
    schemaName: 'idea (title, pitch)',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createIdeaGeneratorChain };