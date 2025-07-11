import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { playabilityValidatorSchema } from '../../schemas/langchain-schemas.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory for PlayabilityValidatorChain with structured output
async function createPlayabilityValidatorChain(llm) {
  if (!llm) throw new Error('LLM instance must be provided to createPlayabilityValidatorChain');
  const promptPath = path.join(__dirname, '../prompts/PlayabilityValidatorChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  
  const playabilityPrompt = new PromptTemplate({
    template: promptString,
    inputVariables: ['mechanics', 'winCondition']
  });

  // Use structured output instead of manual JSON parsing
  const structuredLLM = llm.withStructuredOutput(playabilityValidatorSchema);
  
  return playabilityPrompt
    .pipe(structuredLLM)
    .withConfig({
      runName: 'PlayabilityValidatorChain',
      callbacks: [{
        handleLLMEnd: (output) => {
          console.debug('[PlayabilityValidatorChain] LLM response:', output);
        }
      }]
    });
}

export { createPlayabilityValidatorChain };