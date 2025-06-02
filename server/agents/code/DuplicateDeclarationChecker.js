function extractDeclaredNames(code) {
  const varMatches = [...code.matchAll(/\b(?:var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)].map(m => m[1]);
  const funcMatches = [...code.matchAll(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)].map(m => m[1]);
  return new Set([...varMatches, ...funcMatches]);
}

function DuplicateDeclarationChecker(currentCode, stepCode) {
  const currentNames = extractDeclaredNames(currentCode);
  const stepNames = extractDeclaredNames(stepCode);
  const duplicates = [];
  for (const name of stepNames) {
    if (currentNames.has(name)) {
      duplicates.push(name);
    }
  }
  return duplicates;
}

module.exports = DuplicateDeclarationChecker; 