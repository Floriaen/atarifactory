import { createJSONChain } from '../../../utils/chainFactory.js';
import { mechanicExtractorSchema } from '../../../schemas/langchain-schemas.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, '../../prompts/design/mechanic-extractor.md');

async function createMechanicExtractorChain(llm, options = {}) {
  return createJSONChain({
    chainName: 'MechanicExtractorChain',
    promptFile: 'design/mechanic-extractor.md',
    inputVariables: ['loop'],
    schema: mechanicExtractorSchema,
    preset: 'structured',
    llm: llm,
    sharedState: options.sharedState,
    enableLogging: options.enableLogging !== false
  });
}

export { createMechanicExtractorChain };