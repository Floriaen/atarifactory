const { marked } = require('marked');

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