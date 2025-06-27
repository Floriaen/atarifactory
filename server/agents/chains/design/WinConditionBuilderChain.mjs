import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createJsonExtractionChain } from '../../../utils/createJsonExtractionChain.mjs';

function createWinConditionBuilderChain(llm, options = {}) {
  const promptPath = path.join(__dirname, '../../prompts/design/win-condition-builder.md');
  return createJsonExtractionChain({
    llm,
    promptFile: promptPath,
    inputVariables: ['mechanics'],
    schemaName: 'winCondition string',
    ...(options.sharedState ? { sharedState: options.sharedState } : {})
  });
}

export { createWinConditionBuilderChain };