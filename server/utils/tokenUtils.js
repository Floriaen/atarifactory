// Simple token estimation utility
// For OpenAI models, 1 token ≈ 4 chars in English, or ~0.75 words.
// This is a rough estimate; for precise, use tiktoken or similar.

/**
 * Estimate the number of tokens for a given string.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  if (!text) return 0;
  // 1 token ≈ 4 chars (for English)
  return Math.ceil(text.length / 4);
}

module.exports = { estimateTokens };
