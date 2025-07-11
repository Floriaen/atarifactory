import { createJSONChain } from '../../../utils/chainFactory.js';
import { mechanicExtractorSchema } from '../../../schemas/langchain-schemas.js';

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