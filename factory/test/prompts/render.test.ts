import { describe, it, expect } from 'vitest';
import { loadPrompt, renderPrompt } from '../../src/llm/prompts.js';
import { draftFixture, seedFixture } from '../helpers/fixtures.js';

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
