import { describe, it, expect } from 'vitest';
import { run as staticCheckerRun } from '../../agents/chains/StaticCheckerChain.js';

describe('StaticCheckerChain', () => {
  it('passes valid code without errors', async () => {
    const code = `function setup() {
  const score = 0;
  return score;
}
setup();`;

    const result = await staticCheckerRun({ currentCode: code, stepCode: code });
    expect(result.staticCheckPassed).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags undefined identifiers', async () => {
    const invalidCode = `function play() {
  return missingVariable;
}`;

    const result = await staticCheckerRun({ currentCode: invalidCode, stepCode: invalidCode });
    expect(result.staticCheckPassed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].ruleId).toBe('no-undef');
  });
});
