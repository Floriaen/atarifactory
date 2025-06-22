// SyntaxSanityChain: stub for E2E pipeline compatibility (does not use LLM)

async function run() {
  // Return a mock syntaxOk value for pipeline/test compatibility
  return {
    syntaxOk: true
  };
}

module.exports = { run };
