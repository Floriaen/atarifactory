import { defineChain } from '../../llm/chain.js';
import { GameCode, CodeReview } from '../../contracts/codeSchemas.js';
import { CodeGenInput, CodeFixInput, CodeReviewInput } from './types.js';

const DIR = 'prompts/coding';

/**
 * Authoring `game.js` is constrained output against a fixed runtime contract, not
 * ideation — use the `structured` preset (Sonnet/medium), as art does. Override to a
 * stronger tier at the call site only if live runs show weak code.
 */
export const codeGenChain = defineChain({
  name: 'codeGen',
  promptFile: `${DIR}/codeGen.prompt.md`,
  inputSchema: CodeGenInput,
  outputSchema: GameCode,
  preset: 'structured',
});

/** Targeted repair — same preset; the prompt carries the prior code + the issues. */
export const codeFixChain = defineChain({
  name: 'codeFix',
  promptFile: `${DIR}/codeFix.prompt.md`,
  inputSchema: CodeFixInput,
  outputSchema: GameCode,
  preset: 'structured',
});

/**
 * Faithfulness is a judgement call — like the design critic, run the `validation`
 * preset but override to Opus at the call site (the gate does this).
 */
export const codeReviewChain = defineChain({
  name: 'codeReview',
  promptFile: `${DIR}/codeReview.prompt.md`,
  inputSchema: CodeReviewInput,
  outputSchema: CodeReview,
  preset: 'validation',
});
