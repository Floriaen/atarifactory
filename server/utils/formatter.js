const { marked } = require('marked');

// This utility extracts JavaScript code blocks from markdown text, using the marked library to parse and identify code blocks.

function extractJsCodeBlocks(md) {
  const codeBlocks = [];
  marked(md, {
    walkTokens(token) {
      if (token.type === 'code' && (!token.lang || token.lang.startsWith('js'))) {
        codeBlocks.push(token.text);
      }
    }
  });
  if (codeBlocks.length > 0) {
    return codeBlocks.join('\n\n').trim();
  }
  return md.trim();
}

module.exports = { extractJsCodeBlocks }; 