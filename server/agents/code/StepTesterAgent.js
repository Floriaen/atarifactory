function StepTesterAgent(code) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
  } catch (err) {
    return { valid: false, error: err.message };
  }
  // Simple static check for undefined variables (very basic, not a full linter)
  // Only match standalone variable usage, not property accesses (e.g., ctx.fillStyle)
  const undefinedVarMatch = (code.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\.)/g) || []).filter(v => !['function','var','let','const','if','for','while','return','else','switch','case','break','continue','do','try','catch','finally','throw','new','typeof','instanceof','in','of','await','async','window','document','Math','ctx','canvas','requestAnimationFrame','setTimeout','setInterval','clearTimeout','clearInterval'].includes(v));
  const declaredVars = new Set([
    ...(code.match(/(var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || []).map(s => s.split(/\s+/)[1]),
    ...(code.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g) || []).map(s => s.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/)[1])
  ]);
  for (const v of undefinedVarMatch) {
    if (!declaredVars.has(v)) {
      return { valid: false, error: `Possible undefined variable: ${v}` };
    }
  }
  return { valid: true, error: null };
}

module.exports = StepTesterAgent; 