// Modular GameInventorChain (Runnable API) with structured output
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { gameInventorSchema } from '../../schemas/langchain-schemas.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Async factory that loads the prompt template from a file and constructs a PromptTemplate
async function createGameInventorChain(llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL, temperature: 0 })) {
  const promptPath = path.join(__dirname, '../prompts/GameInventorChain.prompt.md');
  const promptString = await fs.readFile(promptPath, 'utf8');
  const gameInventorPrompt = new PromptTemplate({ template: promptString, inputVariables: [] });
  
  // Use structured output instead of manual JSON parsing
  const structuredLLM = llm.withStructuredOutput(gameInventorSchema);
  
  return gameInventorPrompt
    .pipe(structuredLLM)
    .withConfig({
      runName: 'GameInventorChain',
      callbacks: [{
        handleLLMEnd: (output) => {
          console.debug('[GameInventorChain] LLM response:', output);
        }
      }]
    });
}

/*
// Usage example:
(async () => {
  const chain = await createGameInventorChain();
  const result = await chain.invoke({ title: "Platformer" });
  console.log(result);
})();
*/

export { createGameInventorChain };
