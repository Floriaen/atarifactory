import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda } from '@langchain/core/runnables';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createEntityListBuilderChain(llm) {
  const promptPath = path.join(__dirname, '../../prompts/design/entity-list-builder.md');
  let promptString;
  try {
    promptString = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const parser = new JsonOutputParser();
  const formatInstructions = parser.getFormatInstructions();
  const prompt = new PromptTemplate({
    template: promptString + '\n' + formatInstructions,
    inputVariables: ['mechanics', 'loop', 'winCondition']
  });

  if (!llm || typeof llm.invoke !== 'function') {
    throw new Error('createEntityListBuilderChain requires an LLM instance with an .invoke method');
  }

  // Insert a mapping step to extract .content for the parser
  const chain = prompt
    .pipe(llm)
    .pipe(RunnableLambda.from((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg && typeof arg.content === 'string') return arg.content;
      return undefined;
    }))
    .pipe(parser);

  return {
    async invoke(input) {
      if (
        !input ||
        typeof input !== 'object' ||
        !input.mechanics ||
        !input.loop ||
        !input.winCondition
      ) {
        throw new Error('Input must be an object with mechanics, loop, and winCondition');
      }
      const result = await chain.invoke(input);
      console.debug('[EntityListBuilderChain] Raw LLM output:', result);
      if (!result || !Array.isArray(result.entities)) {
        throw new Error('Output missing required entities array');
      }
      console.debug('[EntityListBuilderChain] Parsed entities:', result.entities);
      return result;
    }
  };
}
export { createEntityListBuilderChain };
