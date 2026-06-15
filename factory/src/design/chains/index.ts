import { defineChain } from '../../llm/chain.js';
import { Critique, GameDraft, Seed, Selection } from '@game-factory/contracts';
import { CriticInput, ElaborateInput, SeedGenInput, SelectInput } from './types.js';

const DIR = 'prompts/design';

export const seedGeneratorChain = defineChain({
  name: 'seedGenerator',
  promptFile: `${DIR}/seedGenerator.prompt.md`,
  inputSchema: SeedGenInput,
  outputSchema: Seed,
  preset: 'creative',
});

export const seedSelectorChain = defineChain({
  name: 'seedSelector',
  promptFile: `${DIR}/seedSelector.prompt.md`,
  inputSchema: SelectInput,
  outputSchema: Selection,
  preset: 'validation',
});

export const elaborateChain = defineChain({
  name: 'elaborate',
  promptFile: `${DIR}/elaborate.prompt.md`,
  inputSchema: ElaborateInput,
  outputSchema: GameDraft,
  preset: 'structured',
});

export const criticChain = defineChain({
  name: 'critic',
  promptFile: `${DIR}/critic.prompt.md`,
  inputSchema: CriticInput,
  outputSchema: Critique,
  preset: 'validation',
});
