import { describe, it, expect } from 'vitest';
import { loadPrompt, renderPrompt } from '../../src/llm/prompts.js';
import { RUNTIME_CONTRACT } from '../../src/coding/runtimeContract.js';
import { draftFixture, gameCodeFixture, seedFixture, validGame } from '../helpers/fixtures.js';

const cases: Record<string, Record<string, unknown>> = {
  'prompts/design/seedGenerator.prompt.md': {
    persona: 'minimalist',
    personaBrief: 'strips everything to one idea',
  },
  'prompts/design/seedSelector.prompt.md': {
    seedsList: '0: verb="x" hook="y" goal=score persona=minimalist — fun',
  },
  'prompts/design/elaborate.prompt.md': {
    seed: seedFixture,
    feedbackBlock: '',
  },
  'prompts/design/critic.prompt.md': {
    draft: draftFixture,
  },
  'prompts/art/sprite.prompt.md': {
    entity: { id: 'player', role: 'player', description: 'the placement cursor' },
    gameTitle: 'Upstack',
    orientation: 'portrait',
  },
  'prompts/coding/codeGen.prompt.md': {
    game: validGame,
    spriteNames: validGame.entities.map((e) => e.id).join(', '),
    runtimeContract: RUNTIME_CONTRACT,
  },
  'prompts/coding/codeFix.prompt.md': {
    game: validGame,
    priorJs: gameCodeFixture.js,
    issues: '- interaction: input does not change the draw output',
  },
  'prompts/coding/codeReview.prompt.md': {
    game: validGame,
    js: gameCodeFixture.js,
  },
};

describe('prompt rendering', () => {
  for (const [file, vars] of Object.entries(cases)) {
    it(`renders ${file} with no leftover placeholders`, async () => {
      const template = await loadPrompt(file);
      const out = renderPrompt(template, vars);
      expect(out).not.toMatch(/\{\{\w+\}\}/);
    });
  }

  it('throws on a missing variable', () => {
    expect(() => renderPrompt('hello {{missing}}', {})).toThrow(/missing/);
  });
});
